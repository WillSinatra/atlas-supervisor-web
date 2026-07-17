import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { documentNumber: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { workOrders: true, addresses: true, equipments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: { where: { isActive: true } },
        equipments: { orderBy: { installedAt: 'desc' } },
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            address: { select: { street: true, number: true, city: true } },
            crew: { select: { name: true } },
          },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async findByDocument(documentNumber: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { documentNumber },
      include: {
        addresses: true,
        equipments: true,
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }
}