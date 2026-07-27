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
import { CrewsService } from './crews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCrewDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';
import { UpdateCrewLocationDto } from './dto/update-crew-location.dto';
import { UpdateCrewStatusDto } from './dto/update-crew-status.dto';

@ApiTags('Cuadrillas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('crews')
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cuadrilla' })
  async create(@Body() createCrewDto: CreateCrewDto) {
    return this.crewsService.create(createCrewDto);
  }

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

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cuadrilla' })
  async update(@Param('id') id: string, @Body() updateCrewDto: UpdateCrewDto) {
    return this.crewsService.update(id, updateCrewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una cuadrilla' })
  async remove(@Param('id') id: string) {
    return this.crewsService.remove(id);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación de cuadrilla' })
  async updateLocation(
    @Param('id') id: string,
    @Body() updateCrewLocationDto: UpdateCrewLocationDto,
  ) {
    return this.crewsService.updateLocation(
      id,
      updateCrewLocationDto.latitude,
      updateCrewLocationDto.longitude,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de cuadrilla' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateCrewStatusDto: UpdateCrewStatusDto,
  ) {
    return this.crewsService.updateStatus(id, updateCrewStatusDto.status);
  }
}
