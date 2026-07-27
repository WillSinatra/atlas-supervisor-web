import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Clientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de cliente' })
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un cliente' })
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Buscar cliente por documento' })
  async findByDocument(@Param('documentNumber') documentNumber: string) {
    return this.customersService.findByDocument(documentNumber);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Listar órdenes de un cliente' })
  async findOrders(@Param('id') id: string) {
    return this.customersService.findOrders(id);
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Agregar una dirección a un cliente' })
  async addAddress(
    @Param('id') id: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.customersService.addAddress(id, createAddressDto);
  }

  @Patch(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Actualizar una dirección de un cliente' })
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.customersService.updateAddress(id, addressId, updateAddressDto);
  }

  @Delete(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Desactivar una dirección de un cliente' })
  async removeAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.removeAddress(id, addressId);
  }
}