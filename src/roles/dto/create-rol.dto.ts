import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRolDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(35, { message: 'El nombre no puede exceder 35 caracteres' })
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Administrador',
    maxLength: 35,
  })
  nombre: string;

  @IsOptional()
  @IsArray({ message: 'permisos debe ser un arreglo' })
  @IsInt({ each: true, message: 'Cada permiso debe ser un número entero' })
  @ApiPropertyOptional({
    description: 'IDs de permisos existentes en Permisos',
    example: [1, 2, 5],
    type: [Number],
  })
  permisos?: number[];
}
