import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCrewDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';
import { CrewStatus } from '@prisma/client';

@Injectable()
export class CrewsService {
  private readonly logger = new Logger(CrewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCrewDto: CreateCrewDto) {
    const { name, code } = createCrewDto;
    const existingCrew = await this.prisma.crew.findFirst({
      where: { OR: [{ name }, { code }] },
    });
    if (existingCrew) {
      throw new ConflictException(
        'Ya existe una cuadrilla con este nombre o código',
      );
    }
    return this.prisma.crew.create({ data: createCrewDto });
  }

  async update(id: string, updateCrewDto: UpdateCrewDto) {
    const crew = await this.prisma.crew.findUnique({ where: { id } });
    if (!crew) {
      throw new NotFoundException('Cuadrilla no encontrada');
    }

    if (updateCrewDto.name && updateCrewDto.name !== crew.name) {
      const existingCrew = await this.prisma.crew.findFirst({
        where: { name: updateCrewDto.name },
      });
      if (existingCrew) {
        throw new ConflictException(
          'Ya existe una cuadrilla con este nombre',
        );
      }
    }

    if (updateCrewDto.code && updateCrewDto.code !== crew.code) {
      const existingCrew = await this.prisma.crew.findFirst({
        where: { code: updateCrewDto.code },
      });
      if (existingCrew) {
        throw new ConflictException(
          'Ya existe una cuadrilla con este código',
        );
      }
    }

    return this.prisma.crew.update({
      where: { id },
      data: updateCrewDto,
    });
  }

  async remove(id: string) {
    const crew = await this.prisma.crew.findUnique({ where: { id } });
    if (!crew) {
      throw new NotFoundException('Cuadrilla no encontrada');
    }

    const activeOrders = await this.prisma.workOrder.count({
      where: { crewId: id, status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } },
    });
    if (activeOrders > 0) {
      throw new ConflictException('No se puede eliminar una cuadrilla con órdenes activas');
    }

    await this.prisma.crew.update({
      where: { id },
      data: { isActive: false },
    });

    return { id, eliminado: true };
  }

  async findAll(params: { page?: number; limit?: number; status?: string; zone?: string }) {
    const { page = 1, limit = 20, status, zone } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (zone) where.zone = zone;

    const [crews, total] = await Promise.all([
      this.prisma.crew.findMany({
        where,
        skip,
        take: limit,
        include: {
          technicians: {
            select: { id: true, firstName: true, lastName: true, status: true, specialty: true },
          },
          vehicle: true,
          _count: {
            select: {
              workOrders: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
              technicians: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.crew.count({ where }),
    ]);

    return {
      data: crews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const crew = await this.prisma.crew.findUnique({
      where: { id },
      include: {
        technicians: true,
        vehicle: true,
        inventory: { include: { material: true } },
        workOrders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            customer: { select: { firstName: true, lastName: true } },
            address: { select: { street: true, number: true, city: true } },
          },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!crew) throw new NotFoundException('Cuadrilla no encontrada');
    return crew;
  }

  async getCrewsMap() {
    const crews = await this.prisma.crew.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        latitude: true,
        longitude: true,
        lastGpsUpdate: true,
        specialty: true,
        technicians: {
          select: { id: true, firstName: true, lastName: true, status: true },
        },
        _count: { select: { workOrders: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
      },
    });

    return crews;
  }

  async updateLocation(id: string, latitude: number, longitude: number) {
    const crew = await this.prisma.crew.findUnique({ where: { id } });
    if (!crew) throw new NotFoundException('Cuadrilla no encontrada');

    return this.prisma.crew.update({
      where: { id },
      data: { latitude, longitude, lastGpsUpdate: new Date() },
    });
  }

  async updateStatus(id: string, status: CrewStatus) {
    const crew = await this.prisma.crew.findUnique({ where: { id } });
    if (!crew) throw new NotFoundException('Cuadrilla no encontrada');

    return this.prisma.crew.update({
      where: { id },
      data: { status },
    });
  }
}
