import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'La nueva contraseña para el usuario',
    example: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ValidateIf((o) => !o.generar)
  password?: string;

  @ApiProperty({
    description: 'Generar una contraseña aleatoria',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  generar?: boolean;
}
