import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type PhotoUploadType = 'photo' | 'before' | 'after';

export class UploadPhotoDto {
  @ApiPropertyOptional({ enum: ['photo', 'before', 'after'], default: 'photo' })
  @IsIn(['photo', 'before', 'after'])
  @IsOptional()
  type?: PhotoUploadType;
}
