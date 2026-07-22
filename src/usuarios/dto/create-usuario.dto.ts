import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(191, { message: 'El nombre no puede exceder 191 caracteres' })
  @ApiProperty({ description: 'Nombre del usuario', example: 'Capturista' })
  nombre!: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(191, {
    message: 'El apellido paterno no puede exceder 191 caracteres',
  })
  @ApiProperty({ description: 'Apellido paterno', example: 'Sistemas' })
  apellidoPaterno!: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  @MaxLength(191, {
    message: 'El apellido materno no puede exceder 191 caracteres',
  })
  @ApiProperty({ description: 'Apellido materno', example: '3' })
  apellidoMaterno!: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @ApiProperty({
    description: 'Número de teléfono',
    example: '5512345678',
  })
  telefono!: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(191, { message: 'El correo no puede exceder 191 caracteres' })
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'capturista3@gmail.com',
  })
  correo!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*\p{L})(?=.*\d)(?=.*[@$!%*?&.])[^\s]+$/u, {
    message:
      'La contraseña debe contener al menos una letra, un número y un símbolo (@$!%*?&.)',
  })
  @ApiProperty({ description: 'Contraseña', example: 'P@ssw0rd.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria' })
  @ApiProperty({ description: 'Confirmación de contraseña', example: 'P@ssw0rd.' })
  confirmPassword!: string;

  @IsInt({ message: 'idRol debe ser un número entero' })
  @ApiProperty({ description: 'Rol asignado', example: 1 })
  idRol!: number;

  @IsOptional()
  @IsInt({ message: 'idGrupo debe ser un número entero' })
  @ApiProperty({
    description: 'Grupo asignado. Opcional; si se omite queda null.',
    example: 1,
    required: false,
    nullable: true,
  })
  idGrupo?: number | null;

  @IsOptional()
  @IsInt({ message: 'emailConfirmed debe ser 0 o 1' })
  @IsIn([0, 1], { message: 'emailConfirmed solo puede ser 0 o 1' })
  @ApiProperty({
    description: 'Correo confirmado (1=Sí, 0=No). Por defecto 1.',
    example: 1,
    required: false,
    default: 1,
  })
  emailConfirmed?: number;

  @IsOptional()
  @IsInt({ message: 'estatus debe ser 0 o 1' })
  @IsIn([0, 1], { message: 'estatus solo puede ser 0 o 1' })
  @ApiProperty({
    description: 'Estatus del usuario (1=Activo, 0=Inactivo). Por defecto 1.',
    example: 1,
    required: false,
    default: 1,
  })
  estatus?: number;
}
