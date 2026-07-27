import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompleteOrderDto {
  @ApiPropertyOptional({ description: 'Resolución / trabajo realizado' })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
