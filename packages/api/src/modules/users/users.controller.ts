import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id') id: string,
    @Body() data: { firstName?: string; lastName?: string; phone?: string; isActive?: boolean; role?: UserRole },
  ) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}