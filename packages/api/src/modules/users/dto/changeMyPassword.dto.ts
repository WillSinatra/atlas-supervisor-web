import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeMyPasswordDto {
  @ApiProperty({
    description: 'La contraseña actual del usuario',
    example: 'string',
  })
  @IsString()
  @IsNotEmpty()
  password_actual: string;

  @ApiProperty({
    description: 'La nueva contraseña para el usuario',
    example: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password_nueva: string;
}
