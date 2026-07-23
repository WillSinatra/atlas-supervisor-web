import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOperationalKpi(params: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = params;
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [totalOrders, completedOrders, cancelledOrders, avgTime] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.workOrder.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.workOrder.aggregate({
        where: { ...where, status: 'COMPLETED', totalTime: { not: null } },
        _avg: { totalTime: true },
      }),
    ]);

    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      completionRate: Math.round(completionRate * 100) / 100,
      averageTimeMinutes: Math.round(avgTime._avg.totalTime || 0),
    };
  }

  async getProductivityByCrew(params: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = params;
    const where: any = { status: 'COMPLETED' };
    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) where.completedAt.lte = new Date(dateTo);
    }

    const crews = await this.prisma.crew.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        specialty: true,
        _count: { select: { workOrders: { where } } },
        workOrders: {
          where,
          select: { totalTime: true },
        },
      },
    });

    return crews.map((crew) => ({
      crewId: crew.id,
      crewName: crew.name,
      completedOrders: crew._count.workOrders,
      avgTime:
        crew.workOrders.length > 0
          ? Math.round(
              crew.workOrders.reduce((sum: number, wo: any) => sum + (wo.totalTime || 0), 0) /
                crew.workOrders.length,
            )
          : 0,
    }));
  }

  async getSlaCompliance(params: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = params;
    const where: any = {
      slaId: { not: null },
      status: 'COMPLETED',
      completedAt: {},
    };

    if (dateFrom) {
      where.completedAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.completedAt.lte = new Date(dateTo);
    }

    const orders = await this.prisma.workOrder.findMany({
      where,
      include: {
        sla: true,
        crew: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const byCrew = orders.reduce((acc, order) => {
      if (!order.crew) return acc;
      if (!acc[order.crew.id]) {
        acc[order.crew.id] = {
          crewName: order.crew.name,
          totalOrders: 0,
          withinSla: 0,
        };
      }
      acc[order.crew.id].totalOrders++;
      if (order.totalTime && order.sla && order.totalTime <= order.sla.resolveTime) {
        acc[order.crew.id].withinSla++;
      }
      return acc;
    }, {});

    const byPriority = orders.reduce((acc, order) => {
      if (!acc[order.priority]) {
        acc[order.priority] = {
          totalOrders: 0,
          withinSla: 0,
        };
      }
      acc[order.priority].totalOrders++;
      if (order.totalTime && order.sla && order.totalTime <= order.sla.resolveTime) {
        acc[order.priority].withinSla++;
      }
      return acc;
    }, {});

    const formatResults = (data) =>
      Object.entries(data).map(([key, value]: [string, any]) => ({
        ...value,
        id: key,
        complianceRate:
          value.totalOrders > 0
            ? Math.round((value.withinSla / value.totalOrders) * 10000) / 100
            : 0,
      }));

    return {
      byCrew: formatResults(byCrew),
      byPriority: formatResults(byPriority),
    };
  }

  async getMaterialUsage(params: { dateFrom?: string; dateTo?: string }) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const materials = await this.prisma.workOrderMaterial.groupBy({
      by: ['materialId'],
      _sum: { quantity: true },
      where: {
        order: {
          status: 'COMPLETED',
          completedAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      },
    });

    const materialIds = materials.map((m) => m.materialId);

    const materialDetails = await this.prisma.material.findMany({
      where: {
        id: {
          in: materialIds,
        },
      },
    });

    const materialMap = new Map(materialDetails.map((m) => [m.id, m]));

    const result = materials.map((m) => {
      const material = materialMap.get(m.materialId);
      return {
        id: m.materialId,
        name: material?.name || 'Desconocido',
        code: material?.code || '',
        category: material?.category,
        totalUsed: m._sum.quantity || 0,
      };
    });

    return result.sort((a, b) => b.totalUsed - a.totalUsed);
  }
}