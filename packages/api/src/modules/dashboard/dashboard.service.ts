import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WorkOrderStatus,
  WorkOrderPriority,
  CrewStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(queryParams: { recientes?: number; actividad?: number } = {}) {
    const { recientes = 10, actividad = 20 } = queryParams;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      pendingOrders,
      inProgressOrders,
      assignedAndAcceptedOrders,
      completedToday,
      overdueOrders,
      availableCrews,
      busyCrews,
      offlineCrews,
      ordersByPriority,
      ordersByStatus,
      recentOrders,
      slaAlerts,
      activityTimeline,
    ] = await Promise.all([
      this.prisma.workOrder.count({ where: { status: 'PENDING' } }),
      this.prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.workOrder.count({
        where: { status: { in: ['ASSIGNED', 'ACCEPTED'] } },
      }),
      this.prisma.workOrder.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          scheduledEnd: { lt: now },
        },
      }),
      this.prisma.crew.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.crew.count({ where: { status: 'BUSY' } }),
      this.prisma.crew.count({
        where: { status: { in: ['OFFLINE', 'ON_BREAK'] } },
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        _count: { id: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.workOrder.findMany({
        take: recientes,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          crew: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workOrder.findMany({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          slaId: { not: null },
        },
        include: {
          sla: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.timelineEntry.findMany({
        take: actividad,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, title: true } },
        },
      }),
    ]);

    // Mapeo de tarjetas
    const tarjetas = {
      ordenes_pendientes: pendingOrders,
      ordenes_en_proceso: inProgressOrders,
      ordenes_asignadas: assignedAndAcceptedOrders,
      completadas_hoy: completedToday,
      ordenes_vencidas: overdueOrders,
      cuadrillas_disponibles: availableCrews,
      cuadrillas_ocupadas: busyCrews,
      cuadrillas_fuera_servicio: offlineCrews,
    };

    // Mapeo de gráficos
    const orderStatusMap: Record<WorkOrderStatus, number> = Object.values(
      WorkOrderStatus,
    ).reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<WorkOrderStatus, number>);
    ordersByStatus.forEach((item) => {
      orderStatusMap[item.status] = item._count.id;
    });

    const graficos = {
      ordenes_por_prioridad: ordersByPriority.map((item) => ({
        prioridad: item.priority.toLowerCase(),
        cantidad: item._count.id,
      })),
      ordenes_por_estado: Object.entries(orderStatusMap).map(([estado, cantidad]) => ({
        estado: estado.toLowerCase(),
        cantidad,
      })),
    };

    // Mapeo de órdenes recientes
    const mappedRecentOrders = recentOrders.map((order) => ({
      ...order,
      cliente: order.customer
        ? {
            id: order.customer.id,
            nombre: `${order.customer.firstName} ${order.customer.lastName}`,
          }
        : null,
      cuadrilla: order.crew
        ? { id: order.crew.id, nombre: order.crew.name }
        : null,
    }));

    // Mapeo de alertas SLA
    const mappedSlaAlerts = slaAlerts
      .map((order) => {
        const slaVencimiento = new Date(order.createdAt.getTime() + order.sla!.resolveTime * 60000);
        const minutosRestantes = Math.round((slaVencimiento.getTime() - now.getTime()) / 60000);
        return {
          ...order,
          minutos_restantes: minutosRestantes,
          vencida: minutosRestantes < 0,
          sla_vencimiento: slaVencimiento,
        };
      })
      .sort((a, b) => a.minutos_restantes - b.minutos_restantes);

    return {
      tarjetas,
      graficos,
      ordenes_recientes: mappedRecentOrders,
      alertas_sla: mappedSlaAlerts,
      actividad: activityTimeline,
      generado_en: now.toISOString(),
    };
  }
}