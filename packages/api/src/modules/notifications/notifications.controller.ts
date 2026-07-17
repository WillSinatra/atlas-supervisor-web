import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Notificaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  async findByUser(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    const user = req.user as { sub: string };
    return this.notificationsService.findByUser(user.sub, { page, limit, unreadOnly });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar notificaciones no leídas' })
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as { sub: string };
    return { count: await this.notificationsService.getUnreadCount(user.sub) };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { sub: string };
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  async markAllAsRead(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.notificationsService.markAllAsRead(user.sub);
  }
}