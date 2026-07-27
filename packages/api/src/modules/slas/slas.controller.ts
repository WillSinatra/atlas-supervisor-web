import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SlasService } from './slas.service';

@ApiTags('SLA')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('slas')
export class SlasController {
  constructor(private readonly slasService: SlasService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de SLAs, ordenado de más a menos exigente' })
  async findAll() {
    const data = await this.slasService.findAll();
    return { data };
  }
}
