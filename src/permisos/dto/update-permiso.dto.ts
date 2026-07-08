import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePermisoDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(100, { message: 'La descripción no puede exceder 100 caracteres' })
  @ApiProperty({
    description: 'Descripción del permiso',
    example: 'Permite crear usuarios en el sistema',
  })
  descripcion: string;
}
