import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { documentNumber } = createCustomerDto;
    if (documentNumber) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { documentNumber },
      });
      if (existingCustomer) {
        throw new ConflictException(
          'Ya existe un cliente con este número de documento',
        );
      }
    }
    return this.prisma.customer.create({ data: createCustomerDto });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (
      updateCustomerDto.documentNumber &&
      updateCustomerDto.documentNumber !== customer.documentNumber
    ) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { documentNumber: updateCustomerDto.documentNumber },
      });
      if (existingCustomer) {
        throw new ConflictException(
          'Ya existe un cliente con este número de documento',
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

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
          _count: {
            select: { workOrders: true, addresses: true, equipments: true },
          },
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

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const orderCount = await this.prisma.workOrder.count({ where: { customerId: id } });
    if (orderCount > 0) {
      throw new ConflictException('No se puede eliminar un cliente con órdenes asociadas');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    return { id, eliminado: true };
  }

  async findOrders(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const orders = await this.prisma.workOrder.findMany({
      where: { customerId: id },
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { customerId: id, orders };
  }

  async addAddress(customerId: string, createAddressDto: CreateAddressDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.prisma.customerAddress.create({
      data: {
        ...createAddressDto,
        customerId,
      },
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: updateAddressDto,
    });
  }

  async removeAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    const orderCount = await this.prisma.workOrder.count({ where: { addressId } });
    if (orderCount > 0) {
      throw new ConflictException('No se puede eliminar una dirección con órdenes asociadas');
    }

    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isActive: false },
    });

    return { id: addressId, eliminado: true };
  }
}