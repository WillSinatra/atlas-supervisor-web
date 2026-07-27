import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ description: 'Motivo de la cancelación' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
