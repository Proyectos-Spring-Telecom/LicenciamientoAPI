import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateRolDto {
  @IsInt({ message: 'id debe ser un número entero' })
  @IsNotEmpty({ message: 'id es obligatorio' })
  @ApiProperty({
    description: 'ID del rol en Roles',
    example: 1,
  })
  id: number;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(35, { message: 'El nombre no puede exceder 35 caracteres' })
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Cliente',
    maxLength: 35,
  })
  nombre: string;

  @IsOptional()
  @IsArray({ message: 'permisos debe ser un arreglo' })
  @IsInt({ each: true, message: 'Cada permiso debe ser un número entero' })
  @ApiPropertyOptional({
    description:
      'Lista final deseada de permisos del rol. Si no se envía, no modifica RolesPermisos.',
    example: [3, 7, 8],
    type: [Number],
  })
  permisos?: number[];
}
