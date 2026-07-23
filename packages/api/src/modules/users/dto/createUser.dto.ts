import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'Email del usuario', example: 'new.user@atlas.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ description: 'Nombre', example: 'Nuevo' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido', example: 'Usuario' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+5491123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Rol del usuario', enum: UserRole, default: UserRole.SUPERVISOR })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Estado del usuario', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
