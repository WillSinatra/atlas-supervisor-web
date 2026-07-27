import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener datos del dashboard ejecutivo' })
  @ApiQuery({ name: 'recientes', required: false, type: Number })
  @ApiQuery({ name: 'actividad', required: false, type: Number })
  async getDashboard(
    @Query('recientes') recientes?: number,
    @Query('actividad') actividad?: number,
  ) {
    return this.dashboardService.getDashboardData({ recientes, actividad });
  }
}