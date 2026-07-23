import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DispatchConfigService } from './dispatch-config.service';
import { WorkOrderStatus } from '@prisma/client';
import { WebsocketsGateway } from '../../websockets/websockets.gateway';

export const DISPATCH_CASCADE_QUEUE = 'dispatch-cascade';
export const CASCADE_TIMEOUT_JOB = 'cascade-offer-timeout';

interface CandidateCrew {
  id: string;
  distanceMeters: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: DispatchConfigService,
    private readonly gateway: WebsocketsGateway,
    @InjectQueue(DISPATCH_CASCADE_QUEUE) private readonly cascadeQueue: Queue,
  ) {}

  /**
   * Se invoca luego de que OrdersService.create() confirmó la transacción de alta.
   * Nunca debe llamarse dentro de esa transacción: si el alta se revierte no debe
   * quedar una cascada disparada sobre una orden que no llegó a persistir.
   */
  async onOrderCreated(orderId: string): Promise<void> {
    const withinWindow = await this.config.isWithinWindow();
    if (!withinWindow) {
      this.logger.log(`OT ${orderId} creada fuera de ventana horaria — queda Pendiente sin cascada`);
      return;
    }

    await this.offerNextCandidate(orderId);
  }

  /**
   * Busca la siguiente cuadrilla candidata dentro del radio configurado que
   * todavía no haya recibido una oferta CASCADE para esta orden, le crea la
   * oferta y encola su timeout. Si no quedan candidatas, agota la cascada
   * (RF-PLA-012): la orden queda Pendiente para asignación manual.
   */
  async offerNextCandidate(orderId: string): Promise<void> {
    const order = await this.prisma.workOrder.findUnique({
      where: { id: orderId },
      include: { address: { select: { latitude: true, longitude: true } } },
    });
    if (!order || order.status !== WorkOrderStatus.PENDING) {
      return;
    }

    const coords = this.pickCoordinates(order);
    if (!coords) {
      this.logger.warn(`OT ${orderId} sin coordenadas disponibles (orden ni domicilio) — no se dispara cascada`);
      return;
    }

    const [radiusMeters, timeoutSeconds, alreadyOfferedCrewIds] = await Promise.all([
      this.config.getCascadeRadiusMeters(),
      this.config.getCascadeTimeoutSeconds(),
      this.getCascadeOfferedCrewIds(orderId),
    ]);

    const candidates = await this.findCandidatesWithin(coords.lat, coords.lng, radiusMeters, alreadyOfferedCrewIds);

    if (candidates.length === 0) {
      await this.exhaustCascade(order.id, order.orderNumber);
      return;
    }

    const next = candidates[0];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000);

    const offer = await this.prisma.dispatchOffer.create({
      data: {
        orderId: order.id,
        crewId: next.id,
        mode: 'CASCADE',
        sequence: alreadyOfferedCrewIds.length,
        distanceMeters: next.distanceMeters,
        status: 'PENDING',
        offeredAt: now,
        expiresAt,
      },
    });

    this.gateway.emitDispatchOffer(next.id, {
      offerId: offer.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: order.title,
      mode: 'CASCADE',
      distanceMeters: next.distanceMeters,
      expiresAt,
    });

    await this.cascadeQueue.add(
      CASCADE_TIMEOUT_JOB,
      { offerId: offer.id, orderId: order.id },
      { delay: timeoutSeconds * 1000, jobId: `cascade-timeout-${offer.id}` },
    );
  }

  /**
   * Barrido de apertura diaria (Etapa 1). Expira cualquier oferta OPEN
   * pendiente de un día anterior (evita acumulación de filas duplicadas)
   * y notifica a todas las cuadrillas disponibles, sin filtro de distancia,
   * por cada OT que sigue Pendiente al momento de abrir el día.
   */
  async openBacklog(): Promise<{ ordersOpened: number; crewsNotified: number }> {
    await this.prisma.dispatchOffer.updateMany({
      where: { mode: 'OPEN', status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });

    const [pendingOrders, availableCrews] = await Promise.all([
      this.prisma.workOrder.findMany({ where: { status: WorkOrderStatus.PENDING } }),
      this.prisma.crew.findMany({ where: { status: 'AVAILABLE', isActive: true } }),
    ]);

    if (pendingOrders.length === 0 || availableCrews.length === 0) {
      return { ordersOpened: pendingOrders.length, crewsNotified: 0 };
    }

    const now = new Date();
    await this.prisma.dispatchOffer.createMany({
      data: pendingOrders.flatMap((order) =>
        availableCrews.map((crew) => ({
          orderId: order.id,
          crewId: crew.id,
          mode: 'OPEN' as const,
          sequence: 0,
          status: 'PENDING' as const,
          offeredAt: now,
        })),
      ),
    });

    for (const order of pendingOrders) {
      for (const crew of availableCrews) {
        this.gateway.emitDispatchOffer(crew.id, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          title: order.title,
          mode: 'OPEN',
        });
      }
    }

    this.logger.log(
      `Apertura diaria: ${pendingOrders.length} OT(s) notificadas en modo abierto a ${availableCrews.length} cuadrilla(s)`,
    );

    return { ordersOpened: pendingOrders.length, crewsNotified: availableCrews.length };
  }

  /**
   * Aceptación de una oferta (cascada u open). Concurrency-safe: el UPDATE
   * condicional `WHERE status = 'PENDING'` lo resuelve Postgres de forma
   * atómica — solo una de dos requests concurrentes puede afectar la fila.
   */
  async claim(orderId: string, crewId: string, userId: string) {
    const order = await this.prisma.workOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const acceptedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.updateMany({
        where: { id: orderId, status: WorkOrderStatus.PENDING },
        data: { status: WorkOrderStatus.ACCEPTED, crewId, acceptedAt },
      });

      if (result.count === 0) {
        throw new ConflictException('Esta orden ya fue tomada por otra cuadrilla');
      }

      await tx.dispatchOffer.updateMany({
        where: { orderId, crewId, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: acceptedAt },
      });

      await tx.dispatchOffer.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: acceptedAt },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          orderId,
          fromStatus: WorkOrderStatus.PENDING,
          toStatus: WorkOrderStatus.ACCEPTED,
          changedBy: userId,
          reason: 'Aceptada por cuadrilla vía despacho',
        },
      });

      await tx.timelineEntry.create({
        data: {
          orderId,
          type: 'system',
          title: 'Orden aceptada vía despacho',
          userId,
        },
      });

      return tx.workOrder.findUniqueOrThrow({ where: { id: orderId } });
    });

    return updated;
  }

  private async exhaustCascade(orderId: string, orderNumber: string): Promise<void> {
    const supervisors = await this.prisma.user.findMany({
      where: { role: { in: ['SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });

    await Promise.all(
      supervisors.map((u) =>
        this.prisma.notification.create({
          data: {
            userId: u.id,
            title: `Cascada agotada — OT ${orderNumber}`,
            message: 'Ninguna cuadrilla dentro del radio aceptó la orden. Requiere asignación manual.',
            type: 'warning',
            metadata: { orderId },
          },
        }),
      ),
    );

    this.gateway.emitDispatchExhausted({ orderId, orderNumber });
    this.logger.warn(`Cascada agotada para OT ${orderNumber} (${orderId}) — vuelve a Pendiente para asignación manual`);
  }

  private async getCascadeOfferedCrewIds(orderId: string): Promise<string[]> {
    const offers = await this.prisma.dispatchOffer.findMany({
      where: { orderId, mode: 'CASCADE' },
      select: { crewId: true },
    });
    return offers.map((o) => o.crewId);
  }

  private pickCoordinates(order: {
    latitude: number | null;
    longitude: number | null;
    address: { latitude: number | null; longitude: number | null } | null;
  }): { lat: number; lng: number } | null {
    if (order.latitude != null && order.longitude != null) {
      return { lat: order.latitude, lng: order.longitude };
    }
    if (order.address?.latitude != null && order.address?.longitude != null) {
      return { lat: order.address.latitude, lng: order.address.longitude };
    }
    return null;
  }

  private async findCandidatesWithin(
    lat: number,
    lng: number,
    radiusMeters: number,
    excludeCrewIds: string[],
  ): Promise<CandidateCrew[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; distance: number }>>`
      SELECT id, ST_Distance(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS distance
      FROM crews
      WHERE status = 'AVAILABLE'
        AND "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
      ORDER BY distance ASC
    `;

    return rows
      .filter((r) => !excludeCrewIds.includes(r.id))
      .map((r) => ({ id: r.id, distanceMeters: r.distance }));
  }
}
