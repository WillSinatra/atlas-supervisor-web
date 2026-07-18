import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado del servidor' })
  getHealth() {
    return {
      status: 'ok',
      time: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
  }
}
