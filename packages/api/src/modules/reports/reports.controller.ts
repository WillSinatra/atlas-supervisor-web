import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'KPIs operacionales' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getKpi(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getOperationalKpi({ dateFrom, dateTo });
  }

  @Get('productivity')
  @ApiOperation({ summary: 'Productividad por cuadrilla' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getProductivity(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getProductivityByCrew({ dateFrom, dateTo });
  }

  @Get('sla')
  @ApiOperation({ summary: 'Cumplimiento de SLA' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getSlaCompliance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getSlaCompliance({ dateFrom, dateTo });
  }

  @Get('materials')
  @ApiOperation({ summary: 'Uso de materiales' })
  async getMaterialUsage() {
    return this.reportsService.getMaterialUsage();
  }
}