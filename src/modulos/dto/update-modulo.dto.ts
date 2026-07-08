import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateModuloDto {
  @IsInt({ message: 'Id debe ser un número entero' })
  @IsNotEmpty({ message: 'Id es obligatorio' })
  @ApiProperty({
    description: 'ID del módulo',
    example: 1,
  })
  Id: number;

  @IsString()
  @IsNotEmpty({ message: 'Nombre es obligatorio' })
  @MaxLength(100, { message: 'Nombre no puede exceder 100 caracteres' })
  @ApiProperty({
    description: 'Nombre del módulo',
    example: 'Módulos',
    maxLength: 100,
  })
  Nombre: string;
}
