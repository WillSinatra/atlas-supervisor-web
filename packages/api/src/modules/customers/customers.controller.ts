import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Clientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

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

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Buscar cliente por documento' })
  async findByDocument(@Param('documentNumber') documentNumber: string) {
    return this.customersService.findByDocument(documentNumber);
  }
}