import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(191, { message: 'El nombre no puede exceder 191 caracteres' })
  @ApiProperty({ description: 'Nombre del usuario', example: 'Capturista' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(191, {
    message: 'El apellido paterno no puede exceder 191 caracteres',
  })
  @ApiProperty({ description: 'Apellido paterno', example: 'Sistemas' })
  apellidoPaterno: string;

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

  @IsInt({ message: 'idRol debe ser un número entero' })
  @ApiProperty({ description: 'Rol asignado', example: 1 })
  idRol!: number;

  @IsInt({ message: 'idGrupo debe ser un número entero' })
  @ApiProperty({ description: 'Grupo asignado', example: 1 })
  idGrupo!: number;
}
