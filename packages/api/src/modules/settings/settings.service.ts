import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfigs(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.systemConfig.findMany({
      where,
      orderBy: { key: 'asc' },
    });
  }

  async getConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Configuración ${key} no encontrada`);
    return config;
  }

  async setConfig(key: string, value: string, category?: string, description?: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, category, description },
      create: { key, value, category, description },
    });
  }

  async getSlas() {
    return this.prisma.sLA.findMany({
      orderBy: [{ priority: 'asc' }, { type: 'asc' }],
    });
  }

  async createSla(data: {
    name: string;
    description?: string;
    priority: string;
    type: string;
    responseTime: number;
    resolveTime: number;
  }) {
    return this.prisma.sLA.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority as any,
        type: data.type as any,
        responseTime: data.responseTime,
        resolveTime: data.resolveTime,
      },
    });
  }

  async getAuditLogs(params: { page?: number; limit?: number; entity?: string; entityId?: string }) {
    const { page = 1, limit = 50, entity, entityId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}