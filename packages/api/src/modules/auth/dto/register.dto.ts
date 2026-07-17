import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email del usuario', example: 'supervisor@atlas.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ description: 'Nombre', example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido', example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+5491123456789' })
  @IsString()
  @IsOptional()
  phone?: string;
}