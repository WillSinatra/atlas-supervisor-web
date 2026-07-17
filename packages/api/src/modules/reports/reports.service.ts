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
      id: crew.id,
      name: crew.name,
      code: crew.code,
      specialty: crew.specialty,
      completedOrders: crew._count.workOrders,
      averageTime: crew.workOrders.length > 0
        ? Math.round(
            crew.workOrders.reduce((sum: number, wo: any) => sum + (wo.totalTime || 0), 0) /
              crew.workOrders.length,
          )
        : 0,
    }));
  }

  async getSlaCompliance(params: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = params;
    const where: any = { slaId: { not: null } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orders = await this.prisma.workOrder.findMany({
      where,
      include: { sla: true },
    });

    const total = orders.length;
    const withinSla = orders.filter(
      (o: any) => o.totalTime && o.sla && o.totalTime <= o.sla.resolveTime,
    ).length;

    return {
      totalSlaOrders: total,
      withinSla,
      exceededSla: total - withinSla,
      complianceRate: total > 0 ? Math.round((withinSla / total) * 100 * 100) / 100 : 0,
    };
  }

  async getMaterialUsage(params: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = params;
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const materials = await this.prisma.workOrderMaterial.groupBy({
      by: ['materialId'],
      _sum: { quantity: true },
      where,
    });

    const materialDetails = await Promise.all(
      materials.map(async (m: any) => {
        const material = await this.prisma.material.findUnique({
          where: { id: m.materialId },
        });
        return {
          id: m.materialId,
          name: material?.name || 'Desconocido',
          code: material?.code || '',
          category: material?.category,
          totalUsed: m._sum.quantity || 0,
        };
      }),
    );

    return materialDetails.sort((a: any, b: any) => b.totalUsed - a.totalUsed);
  }
}