import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreatePermisoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @ApiProperty({
    description: 'Nombre del permiso',
    example: 'Crear usuarios',
  })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(100, { message: 'La descripción no puede exceder 100 caracteres' })
  @ApiProperty({
    description: 'Descripción del permiso',
    example: 'Permite crear usuarios en el sistema',
  })
  descripcion: string;

  @IsInt({ message: 'idModulo debe ser un número entero' })
  @IsNotEmpty({ message: 'idModulo es obligatorio' })
  @ApiProperty({
    description: 'ID del módulo al que pertenece el permiso',
    example: 21,
  })
  idModulo: number;
}
