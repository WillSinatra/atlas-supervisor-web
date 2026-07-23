import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

@Injectable()
export class SlasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const slas = await this.prisma.sLA.findMany({
      where: { isActive: true },
    });

    const sortedSlas = slas.sort((a, b) => {
      const diff =
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      if (diff !== 0) return diff;
      return a.resolveTime - b.resolveTime;
    });

    return sortedSlas.map((sla) => ({
      id: sla.id,
      nombre: sla.name,
      descripcion: sla.description,
      tiempo_resolucion: sla.resolveTime,
      tiempo_respuesta: sla.responseTime,
      prioridad: sla.priority.toLowerCase(),
      activo: sla.isActive,
    }));
  }
}
