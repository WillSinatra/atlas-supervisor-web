import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Configuración')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('configs')
  @ApiOperation({ summary: 'Obtener configuraciones del sistema' })
  async getConfigs(@Query('category') category?: string) {
    return this.settingsService.getConfigs(category);
  }

  @Get('configs/:key')
  @ApiOperation({ summary: 'Obtener configuración por clave' })
  async getConfig(@Param('key') key: string) {
    return this.settingsService.getConfig(key);
  }

  @Post('configs/:key')
  @ApiOperation({ summary: 'Actualizar configuración' })
  async setConfig(
    @Param('key') key: string,
    @Body() body: { value: string; category?: string; description?: string },
  ) {
    return this.settingsService.setConfig(key, body.value, body.category, body.description);
  }

  @Get('slas')
  @ApiOperation({ summary: 'Listar configuraciones SLA' })
  async getSlas() {
    return this.settingsService.getSlas();
  }

  @Post('slas')
  @ApiOperation({ summary: 'Crear configuración SLA' })
  async createSla(@Body() body: {
    name: string;
    description?: string;
    priority: string;
    type: string;
    responseTime: number;
    resolveTime: number;
  }) {
    return this.settingsService.createSla(body);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Listar logs de auditoría' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.settingsService.getAuditLogs({ page, limit, entity, entityId });
  }
}