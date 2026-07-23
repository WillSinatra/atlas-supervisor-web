import { Controller, Get, Param, NotFoundException, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RawResponse } from '../../common/decorators/raw-response.decorator';
import { StorageService } from './storage.service';

@ApiTags('Archivos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get(':id')
  @RawResponse()
  @ApiOperation({ summary: 'Descargar el binario de un archivo (foto o firma)' })
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    const record = photo ?? (await this.prisma.signature.findUnique({ where: { id } }));

    if (!record) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const buffer = await this.storage.read(record.url);
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.send(buffer);
  }
}
