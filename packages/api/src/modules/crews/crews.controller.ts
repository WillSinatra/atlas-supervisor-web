import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrewsService } from './crews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Cuadrillas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('crews')
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuadrillas' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('zone') zone?: string,
  ) {
    return this.crewsService.findAll({ page, limit, status, zone });
  }

  @Get('map')
  @ApiOperation({ summary: 'Obtener ubicaciones de cuadrillas para mapa' })
  async getCrewsMap() {
    return this.crewsService.getCrewsMap();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de cuadrilla' })
  async findById(@Param('id') id: string) {
    return this.crewsService.findById(id);
  }

  @Post(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación de cuadrilla' })
  async updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.crewsService.updateLocation(id, body.latitude, body.longitude);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de cuadrilla' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.crewsService.updateStatus(id, body.status);
  }
}