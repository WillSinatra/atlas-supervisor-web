import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}