
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @IsInt()
  @IsOptional()
  @IsIn([0, 1], { message: 'Solo se permite 0 o 1' })
  @ApiProperty({
    description: 'Confirmación de email (0=No, 1=Sí)',
    example: 0,
  })
  emailConfirmed?: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  @ApiProperty({
    description: 'Correo electrónico',
    example: 'usuario@ejemplo.com',
    required: false,
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    required: false,
  })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty({
    description: 'Apellido paterno',
    example: 'Pérez',
    required: true,
  })
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty({
    description: 'Apellido materno',
    example: 'López',
    required: false,
  })
  apellidoMaterno?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Teléfono',
    example: '5512345678',
    required: false,
  })
  phoneNumber?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1], { message: 'Solo se permite 0 o 1' })
  @ApiProperty({
    description: 'Estatus del usuario (1=Activo, 0=Inactivo)',
    example: 1,
  })
  estatus?: number = 1;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'Rol asignado', example: 2 })
  idRol?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'Grupo asignado', example: 5 })
  idGrupo?: number;
}
