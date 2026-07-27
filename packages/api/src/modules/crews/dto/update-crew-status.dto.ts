import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CrewStatus } from '@prisma/client';

export class UpdateCrewStatusDto {
  @ApiProperty({ enum: CrewStatus })
  @IsEnum(CrewStatus)
  status: CrewStatus;
}
