import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Órdenes de Trabajo')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de trabajo' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'crewId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('crewId') crewId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.findAll({
      page, limit, search, status, priority, type,
      crewId, customerId, dateFrom, dateTo,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del dashboard' })
  async getStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de orden' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de orden' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, 'system', body.reason);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Asignar orden a cuadrilla' })
  async assign(
    @Param('id') id: string,
    @Body() body: { crewId: string },
  ) {
    return this.ordersService.assign(id, body.crewId, 'system');
  }
}