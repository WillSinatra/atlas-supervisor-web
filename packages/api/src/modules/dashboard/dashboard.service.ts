import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      pendingOrders,
      inProgressOrders,
      completedToday,
      overdueOrders,
      availableCrews,
      busyCrews,
      ordersByPriority,
      ordersByStatus,
      recentOrders,
      slaAlerts,
      activityTimeline,
    ] = await Promise.all([
      // Órdenes pendientes
      this.prisma.workOrder.count({ where: { status: 'PENDING' } }),
      // Órdenes en progreso
      this.prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      // Completadas hoy
      this.prisma.workOrder.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      // Vencidas
      this.prisma.workOrder.count({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          scheduledDate: { lt: now },
        },
      }),
      // Cuadrillas disponibles
      this.prisma.crew.count({ where: { status: 'AVAILABLE' } }),
      // Cuadrillas ocupadas
      this.prisma.crew.count({ where: { status: 'BUSY' } }),
      // Órdenes por prioridad
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        _count: true,
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      // Órdenes por estado
      this.prisma.workOrder.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Órdenes recientes
      this.prisma.workOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          crew: { select: { name: true } },
        },
      }),
      // Alertas SLA
      this.prisma.workOrder.findMany({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          slaId: { not: null },
          scheduledDate: { lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
        },
        take: 10,
        include: {
          sla: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      // Timeline de actividad
      this.prisma.timelineEntry.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, title: true } },
        },
      }),
    ]);

    return {
      cards: {
        pendingOrders,
        inProgressOrders,
        completedToday,
        overdueOrders,
        availableCrews,
        busyCrews,
      },
      charts: {
        ordersByPriority,
        ordersByStatus,
      },
      recentOrders,
      slaAlerts,
      activityTimeline,
    };
  }
}