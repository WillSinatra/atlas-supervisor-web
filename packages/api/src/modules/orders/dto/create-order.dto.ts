import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsUUID,
} from 'class-validator';
import {
  WorkOrderPriority,
  WorkOrderType,
} from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ enum: WorkOrderType })
  @IsEnum(WorkOrderType)
  @IsOptional()
  type?: WorkOrderType;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  estimatedTime?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  scheduledDate?: Date;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  addressId: string;
}
