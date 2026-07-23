import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DispatchService, DISPATCH_CASCADE_QUEUE } from './dispatch.service';
import { DispatchConfigService } from './dispatch-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebsocketsGateway } from '../../websockets/websockets.gateway';

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: any;
  let config: jest.Mocked<Pick<DispatchConfigService, keyof DispatchConfigService>>;
  let gateway: jest.Mocked<WebsocketsGateway>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = {
      workOrder: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      dispatchOffer: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        createMany: jest.fn(),
      },
      crew: { findMany: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn() },
      workOrderStatusHistory: { create: jest.fn() },
      timelineEntry: { create: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation((cb: any) => cb(prisma)),
    };

    queue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: DispatchConfigService,
          useValue: {
            isWithinWindow: jest.fn(),
            getCascadeRadiusMeters: jest.fn().mockResolvedValue(8000),
            getCascadeTimeoutSeconds: jest.fn().mockResolvedValue(30),
            getWindowStartHour: jest.fn().mockResolvedValue(8),
            getWindowEndHour: jest.fn().mockResolvedValue(18),
          },
        },
        {
          provide: WebsocketsGateway,
          useValue: { emitDispatchOffer: jest.fn(), emitDispatchExhausted: jest.fn() },
        },
        { provide: getQueueToken(DISPATCH_CASCADE_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(DispatchService);
    config = module.get(DispatchConfigService);
    gateway = module.get(WebsocketsGateway);
  });

  describe('onOrderCreated', () => {
    it('no dispara cascada fuera de la ventana horaria (corte de las 18:00 / apertura de 08:00)', async () => {
      (config.isWithinWindow as jest.Mock).mockResolvedValue(false);

      await service.onOrderCreated('order-1');

      expect(prisma.dispatchOffer.create).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('no dispara cascada si la OT no tiene coordenadas propias ni de domicilio', async () => {
      (config.isWithinWindow as jest.Mock).mockResolvedValue(true);
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        latitude: null,
        longitude: null,
        address: { latitude: null, longitude: null },
      });

      await service.onOrderCreated('order-1');

      expect(prisma.dispatchOffer.create).not.toHaveBeenCalled();
    });

    it('usa las coordenadas del domicilio si la OT no tiene lat/lng propias', async () => {
      (config.isWithinWindow as jest.Mock).mockResolvedValue(true);
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 'WO-1',
        title: 'Falla en fibra',
        latitude: null,
        longitude: null,
        address: { latitude: -34.6, longitude: -58.4 },
      });
      prisma.$queryRaw.mockResolvedValue([{ id: 'crew-near', distance: 3000 }]);
      prisma.dispatchOffer.create.mockResolvedValue({ id: 'offer-1' });

      await service.onOrderCreated('order-1');

      expect(prisma.dispatchOffer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ crewId: 'crew-near', mode: 'CASCADE' }) }),
      );
      expect(queue.add).toHaveBeenCalled();
    });
  });

  describe('offerNextCandidate — radio de 8km', () => {
    beforeEach(() => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        orderNumber: 'WO-1',
        title: 'Falla en fibra',
        latitude: -34.6,
        longitude: -58.4,
        address: null,
      });
    });

    it('crea la oferta solo para la cuadrilla dentro de 8km (la de afuera queda excluida por el propio query)', async () => {
      // El $queryRaw ya filtra por ST_DWithin — simulamos que solo devuelve la candidata cercana,
      // la cuadrilla fuera de radio nunca aparece en el resultado.
      prisma.$queryRaw.mockResolvedValue([{ id: 'crew-8km', distance: 7500 }]);
      prisma.dispatchOffer.create.mockResolvedValue({ id: 'offer-1' });

      await service.offerNextCandidate('order-1');

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.dispatchOffer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ crewId: 'crew-8km', distanceMeters: 7500, mode: 'CASCADE', sequence: 0 }),
        }),
      );
      expect(gateway.emitDispatchOffer).toHaveBeenCalledWith('crew-8km', expect.any(Object));
      expect(queue.add).toHaveBeenCalledWith(
        expect.any(String),
        { offerId: 'offer-1', orderId: 'order-1' },
        expect.objectContaining({ delay: 30000 }),
      );
    });

    it('agota la cascada y notifica a supervisores si no hay candidatas dentro del radio', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([{ id: 'sup-1' }]);

      await service.offerNextCandidate('order-1');

      expect(prisma.dispatchOffer.create).not.toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'sup-1' }) }),
      );
      expect(gateway.emitDispatchExhausted).toHaveBeenCalled();
    });

    it('excluye cuadrillas que ya recibieron una oferta CASCADE para esta OT (avance de cascada)', async () => {
      prisma.dispatchOffer.findMany.mockResolvedValue([{ crewId: 'crew-ya-ofrecida' }]);
      prisma.$queryRaw.mockResolvedValue([
        { id: 'crew-ya-ofrecida', distance: 1000 },
        { id: 'crew-siguiente', distance: 5000 },
      ]);
      prisma.dispatchOffer.create.mockResolvedValue({ id: 'offer-2' });

      await service.offerNextCandidate('order-1');

      expect(prisma.dispatchOffer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ crewId: 'crew-siguiente' }) }),
      );
    });
  });

  describe('claim — concurrencia', () => {
    it('acepta la orden cuando el update condicional afecta una fila', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING' });
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });
      prisma.workOrder.findUniqueOrThrow.mockResolvedValue({ id: 'order-1', status: 'ACCEPTED', crewId: 'crew-1' });

      const result = await service.claim('order-1', 'crew-1', 'user-1');

      expect(result.status).toBe('ACCEPTED');
      expect(prisma.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'ACCEPTED', crewId: 'crew-1' }),
      });
      expect(prisma.dispatchOffer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderId: 'order-1', status: 'PENDING' }, data: expect.objectContaining({ status: 'CANCELLED' }) }),
      );
    });

    it('lanza 409 (ConflictException) cuando otra cuadrilla ya tomó la orden (update condicional afecta 0 filas)', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING' });
      prisma.workOrder.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.claim('order-1', 'crew-2', 'user-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('openBacklog — Etapa 1 / limpieza de ofertas OPEN previas', () => {
    it('expira las ofertas OPEN pendientes de un día anterior antes de crear las de hoy (evita acumulación)', async () => {
      prisma.workOrder.findMany.mockResolvedValue([{ id: 'order-1', orderNumber: 'WO-1', title: 'x' }]);
      prisma.crew.findMany.mockResolvedValue([{ id: 'crew-1' }]);

      await service.openBacklog();

      const calls = prisma.dispatchOffer.updateMany.mock.invocationCallOrder;
      expect(prisma.dispatchOffer.updateMany).toHaveBeenCalledWith({
        where: { mode: 'OPEN', status: 'PENDING' },
        data: expect.objectContaining({ status: 'EXPIRED' }),
      });
      expect(prisma.dispatchOffer.createMany).toHaveBeenCalled();
      // La limpieza debe ejecutarse antes de crear las ofertas nuevas.
      expect(calls[0]).toBeLessThan(prisma.dispatchOffer.createMany.mock.invocationCallOrder[0]);
      expect(gateway.emitDispatchOffer).toHaveBeenCalledWith('crew-1', expect.objectContaining({ mode: 'OPEN' }));
    });

    it('no acumula ofertas si la misma OT sigue sin tomarse dos días seguidos', async () => {
      prisma.workOrder.findMany.mockResolvedValue([{ id: 'order-1', orderNumber: 'WO-1', title: 'x' }]);
      prisma.crew.findMany.mockResolvedValue([{ id: 'crew-1' }]);

      // Simula el estado real de la tabla: createMany agrega filas, updateMany las marca EXPIRED.
      let rows: Array<{ orderId: string; crewId: string; status: string }> = [];
      prisma.dispatchOffer.createMany.mockImplementation(({ data }: any) => {
        rows.push(...data.map((d: any) => ({ orderId: d.orderId, crewId: d.crewId, status: 'PENDING' })));
        return Promise.resolve({ count: data.length });
      });
      prisma.dispatchOffer.updateMany.mockImplementation(({ where }: any) => {
        let count = 0;
        if (where.mode === 'OPEN' && where.status === 'PENDING') {
          rows.forEach((r) => {
            if (r.status === 'PENDING') {
              r.status = 'EXPIRED';
              count++;
            }
          });
        }
        return Promise.resolve({ count });
      });

      await service.openBacklog(); // día 1
      await service.openBacklog(); // día 2, misma OT sigue Pendiente

      const pendingRows = rows.filter((r) => r.status === 'PENDING');
      expect(pendingRows).toHaveLength(1); // solo la del barrido más reciente
      expect(rows.filter((r) => r.status === 'EXPIRED')).toHaveLength(1); // la del día 1 quedó expirada, no acumulada
    });
  });
});
