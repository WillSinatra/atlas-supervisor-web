import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../files/storage.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CheckinOrderDto } from './dto/checkin-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { PhotoUploadType } from './dto/upload-photo.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly dispatchService: DispatchService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const orderNumber = `WO-${new Date().getTime()}`;
    const order = await this.prisma.workOrder.create({
      data: {
        ...createOrderDto,
        orderNumber,
        createdById: userId,
      },
    });

    await this.prisma.timelineEntry.create({
      data: {
        orderId: order.id,
        type: 'system',
        title: 'Orden de trabajo creada',
        userId,
      },
    });

    // Se dispara después de confirmar el alta (nunca dentro de la transacción de arriba):
    // si el alta se revirtiera no debe quedar una cascada sobre una orden inexistente.
    this.dispatchService.onOrderCreated(order.id).catch((err) =>
      this.logger.error(`Error al iniciar despacho para OT ${order.id}: ${err.message}`, err.stack),
    );

    return order;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    crewId?: string;
    customerId?: string;
    zone?: string;
    dateFrom?: string;
    dateTo?: string;
    slaStatus?: string;
  }) {
    const { page = 1, limit = 20, search, status, priority, type, crewId, customerId, dateFrom, dateTo } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { title: { contains: search, mode: 'insensitive' as const } },
        { customer: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    if (status) where.status = status as any;
    if (priority) where.priority = priority as any;
    if (type) where.type = type as any;
    if (crewId) where.crewId = crewId;
    if (customerId) where.customerId = customerId;

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          address: {
            select: { street: true, number: true, city: true, neighborhood: true },
          },
          crew: {
            select: { id: true, name: true, code: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          sla: {
            select: { name: true, responseTime: true, resolveTime: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        address: true,
        crew: {
          include: {
            technicians: true,
            vehicle: true,
          },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        sla: true,
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        materials: {
          include: { material: true },
        },
        photos: { orderBy: { createdAt: 'desc' } },
        signature: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        timeline: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return order;
  }

  async updateStatus(id: string, status: string, userId: string, reason?: string) {
    const order = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const previousStatus = order.status;

    const updateData: any = { status };
    if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason;
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: updateData,
      }),
      this.prisma.workOrderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: previousStatus,
          toStatus: status as any,
          changedBy: userId,
          reason,
        },
      }),
      this.prisma.timelineEntry.create({
        data: {
          orderId: id,
          type: 'system',
          title: `Estado cambiado de ${previousStatus} a ${status}`,
          description: reason,
          userId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'STATUS_CHANGE',
          entity: 'work_order',
          entityId: id,
          orderId: id,
          metadata: { from: previousStatus, to: status, reason },
        },
      }),
    ]);

    return updated;
  }

  async assign(id: string, crewId: string, userId: string) {
    const order = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const crew = await this.prisma.crew.findUnique({ where: { id: crewId } });
    if (!crew) {
      throw new NotFoundException('Cuadrilla no encontrada');
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: {
          crewId,
          status: 'ASSIGNED',
          assignedToId: userId,
        },
      }),
      this.prisma.timelineEntry.create({
        data: {
          orderId: id,
          type: 'system',
          title: `Asignada a cuadrilla ${crew.name}`,
          userId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'ASSIGN',
          entity: 'work_order',
          entityId: id,
          orderId: id,
          metadata: { crewId, crewName: crew.name },
        },
      }),
    ]);

    return updated;
  }

  async getDashboardStats() {
    const [pending, inProgress, completedToday, overdue, byPriority, byStatus] = await Promise.all([
      this.prisma.workOrder.count({ where: { status: 'PENDING' } }),
      this.prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.workOrder.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          scheduledDate: { lt: new Date() },
        },
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        _count: true,
      }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      pending,
      inProgress,
      completedToday,
      overdue,
      byPriority,
      byStatus,
    };
  }

  private async getOrderOrThrow(id: string) {
    const order = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }
    return order;
  }

  private async recordTimeline(
    orderId: string,
    userId: string,
    title: string,
    description?: string,
  ) {
    return this.prisma.timelineEntry.create({
      data: {
        orderId,
        type: 'system',
        title,
        description,
        userId,
      },
    });
  }

  async update(id: string, dto: UpdateOrderDto, userId: string) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar');
    }

    await this.getOrderOrThrow(id);

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({ where: { id }, data: dto as Prisma.WorkOrderUpdateInput }),
      this.recordTimeline(id, userId, 'Orden actualizada', Object.keys(dto).join(', ')),
    ]);

    return updated;
  }

  async accept(id: string, userId: string) {
    const order = await this.getOrderOrThrow(id);

    if (order.status !== WorkOrderStatus.ASSIGNED) {
      throw new ConflictException('La orden debe estar asignada para poder aceptarse');
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.ACCEPTED, acceptedAt: new Date() },
      }),
      this.prisma.workOrderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: WorkOrderStatus.ACCEPTED, changedBy: userId },
      }),
      this.recordTimeline(id, userId, 'Orden aceptada'),
    ]);

    return updated;
  }

  async reject(id: string, userId: string, reason: string) {
    const order = await this.getOrderOrThrow(id);

    if (!([WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED] as WorkOrderStatus[]).includes(order.status)) {
      throw new ConflictException('La orden debe estar asignada o aceptada para poder rechazarse');
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.PENDING, crewId: null, acceptedAt: null },
      }),
      this.prisma.workOrderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: WorkOrderStatus.PENDING, changedBy: userId, reason },
      }),
      this.recordTimeline(id, userId, 'Orden rechazada', reason),
    ]);

    return updated;
  }

  async checkin(id: string, userId: string, dto: CheckinOrderDto) {
    const order = await this.getOrderOrThrow(id);

    if (!([WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED] as WorkOrderStatus[]).includes(order.status)) {
      throw new ConflictException('La orden debe estar asignada o aceptada para hacer check-in');
    }

    const data: Prisma.WorkOrderUpdateInput = {
      status: WorkOrderStatus.IN_PROGRESS,
      arrivedAt: new Date(),
      startedAt: new Date(),
    };
    if (dto?.lat !== undefined) data.latitude = dto.lat;
    if (dto?.lng !== undefined) data.longitude = dto.lng;

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({ where: { id }, data }),
      this.prisma.workOrderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: WorkOrderStatus.IN_PROGRESS, changedBy: userId },
      }),
      this.recordTimeline(id, userId, 'Check-in realizado', dto?.lat !== undefined ? `lat:${dto.lat}, lng:${dto.lng}` : undefined),
    ]);

    return updated;
  }

  async complete(id: string, userId: string, dto: CompleteOrderDto) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { signature: true, photos: true },
    });
    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    if (order.status === WorkOrderStatus.COMPLETED) {
      return { ...order, duplicado: true };
    }

    if (order.status === WorkOrderStatus.CANCELLED) {
      throw new ConflictException('No se puede completar una orden cancelada');
    }

    const hasSignature = !!order.signature;
    const hasPhotoAfter = order.photos.some((p) => p.type === 'after');

    const detalles: string[] = [];
    if (!hasSignature) detalles.push('firma_cliente');
    if (!hasPhotoAfter) detalles.push('foto_despues');

    if (detalles.length > 0) {
      throw new BadRequestException({
        message: 'Faltan datos requeridos para completar la orden',
        detalles,
      });
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
          resolution: dto?.resolution,
          notes: dto?.notes ?? order.notes,
        },
      }),
      this.prisma.workOrderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: WorkOrderStatus.COMPLETED, changedBy: userId },
      }),
      this.recordTimeline(id, userId, 'Orden completada'),
    ]);

    return { ...updated, duplicado: false };
  }

  async cancel(id: string, userId: string, reason: string) {
    const order = await this.getOrderOrThrow(id);

    if (order.status === WorkOrderStatus.CANCELLED) {
      return { ...order, duplicado: true };
    }

    if (order.status === WorkOrderStatus.COMPLETED) {
      throw new ConflictException('No se puede cancelar una orden completada');
    }

    const [updated] = await Promise.all([
      this.prisma.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      }),
      this.prisma.workOrderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: WorkOrderStatus.CANCELLED, changedBy: userId, reason },
      }),
      this.recordTimeline(id, userId, 'Orden cancelada', reason),
    ]);

    return { ...updated, duplicado: false };
  }

  async uploadSignature(id: string, userId: string, file: Express.Multer.File) {
    await this.getOrderOrThrow(id);

    const storageKey = await this.storage.save(id, file.buffer, file.originalname);

    const signature = await this.prisma.signature.upsert({
      where: { orderId: id },
      create: { orderId: id, url: storageKey, mimeType: file.mimetype, size: file.size },
      update: { url: storageKey, mimeType: file.mimetype, size: file.size },
    });

    await this.recordTimeline(id, userId, 'Firma del cliente cargada');

    return signature;
  }

  async uploadPhoto(id: string, userId: string, file: Express.Multer.File, type: PhotoUploadType = 'photo') {
    await this.getOrderOrThrow(id);

    const storageKey = await this.storage.save(id, file.buffer, file.originalname);

    const photo = await this.prisma.photo.create({
      data: {
        orderId: id,
        url: storageKey,
        type,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    await this.recordTimeline(id, userId, type === 'after' ? 'Foto de cierre cargada' : 'Foto cargada');

    return photo;
  }

  async listPhotos(id: string) {
    await this.getOrderOrThrow(id);

    const photos = await this.prisma.photo.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orderId: id,
      photos: photos.map((f) => ({
        id: f.id,
        type: f.type,
        mime: f.mimeType,
        size: f.size,
        url: `/api/v1/files/${f.id}`,
        createdAt: f.createdAt,
      })),
    };
  }
}