import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  MinLength,
  IsIn,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El UserName es obligatorio' })
  @MaxLength(191, {
    message: 'El UserName no puede exceder los 191 caracteres',
  })
  @ApiProperty({ description: 'Nombre de usuario', example: 'usuario01' })
  userName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  @ApiProperty({ description: 'Correo electrónico', example: 'usuario@ejemplo.com', required: false })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'El Password es obligatorio' })
  @MinLength(6, { message: 'El Password debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*\p{L})(?=.*\d)(?=.*[@$!%*?&.])[^\s]+$/u, {
    message:
      'El Password debe contener al menos una letra (UTF-8), un número y un símbolo común (@$!%*?&.)',
  })
  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'P@ssword123',
  })
  passwordHash: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1], { message: 'Solo se permite 0 o 1' })
  @ApiProperty({
    description: 'Confirmación de email (0=No, 1=Sí)',
    example: 1,
  })
  emailConfirmed?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    required: false,
  })
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  @ApiProperty({
    description: 'Apellido paterno',
    example: 'Pérez',
    required: true,
  })
  apellidoPaterno: string;

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

  @IsInt()
  @ApiProperty({ description: 'Rol asignado', example: 2 })
  idRol: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'Grupo asignado', example: 5 })
  idGrupo?: number;
}
