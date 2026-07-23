import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CheckinOrderDto } from './dto/checkin-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { ClaimOrderDto } from '../dispatch/dto/claim-order.dto';

const IMAGE_TYPES_REGEX = /^image\/(jpeg|png|webp|gif)$/;
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

@ApiTags('Órdenes de Trabajo')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly dispatchService: DispatchService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva orden de trabajo' })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de trabajo' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'crewId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('crewId') crewId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.findAll({
      page,
      limit,
      search,
      status,
      priority,
      type,
      crewId,
      customerId,
      dateFrom,
      dateTo,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del dashboard' })
  async getStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de orden' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar campos editables de la orden' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Req() req: any) {
    return this.ordersService.update(id, dto, req.user.sub);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de orden' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Req() req: any,
  ) {
    return this.ordersService.updateStatus(id, body.status, req.user.sub, body.reason);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Asignar orden a cuadrilla' })
  async assign(@Param('id') id: string, @Body() body: { crewId: string }, @Req() req: any) {
    return this.ordersService.assign(id, body.crewId, req.user.sub);
  }

  @Post(':id/dispatch/claim')
  @ApiOperation({ summary: 'Aceptar una oferta de despacho (cascada o notificación abierta)' })
  async claim(@Param('id') id: string, @Body() dto: ClaimOrderDto, @Req() req: any) {
    return this.dispatchService.claim(id, dto.crewId, req.user.sub);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Aceptar una orden asignada' })
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.accept(id, req.user.sub);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rechazar una orden asignada o aceptada' })
  async reject(@Param('id') id: string, @Body() dto: RejectOrderDto, @Req() req: any) {
    return this.ordersService.reject(id, req.user.sub, dto.reason);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Registrar llegada al sitio de la orden' })
  async checkin(@Param('id') id: string, @Body() dto: CheckinOrderDto, @Req() req: any) {
    return this.ordersService.checkin(id, req.user.sub, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Completar una orden' })
  async complete(@Param('id') id: string, @Body() dto: CompleteOrderDto, @Req() req: any) {
    return this.ordersService.complete(id, req.user.sub, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una orden' })
  async cancel(@Param('id') id: string, @Body() dto: CancelOrderDto, @Req() req: any) {
    return this.ordersService.cancel(id, req.user.sub, dto.reason);
  }

  @Post(':id/signature')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar la firma del cliente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSignature(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: IMAGE_TYPES_REGEX })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    const signature = await this.ordersService.uploadSignature(id, req.user.sub, file);
    return {
      id: signature.id,
      orderId: signature.orderId,
      type: 'signature',
      mime: signature.mimeType,
      size: signature.size,
      url: `/api/v1/files/${signature.id}`,
      createdAt: signature.createdAt,
    };
  }

  @Post(':id/photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar una foto de la orden' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: IMAGE_TYPES_REGEX })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
    @Req() req: any,
  ) {
    const photo = await this.ordersService.uploadPhoto(id, req.user.sub, file, dto?.type ?? 'photo');
    return {
      id: photo.id,
      orderId: photo.orderId,
      type: photo.type,
      mime: photo.mimeType,
      size: photo.size,
      url: `/api/v1/files/${photo.id}`,
      createdAt: photo.createdAt,
    };
  }

  @Get(':id/photos')
  @ApiOperation({ summary: 'Listar fotos de la orden' })
  async listPhotos(@Param('id') id: string) {
    return this.ordersService.listPhotos(id);
  }
}
