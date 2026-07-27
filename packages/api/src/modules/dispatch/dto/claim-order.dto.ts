import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ClaimOrderDto {
  @ApiProperty()
  @IsUUID()
  crewId: string;
}
