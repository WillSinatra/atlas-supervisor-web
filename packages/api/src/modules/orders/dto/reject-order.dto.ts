import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectOrderDto {
  @ApiProperty({ description: 'Motivo del rechazo' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
