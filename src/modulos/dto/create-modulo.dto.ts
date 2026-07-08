import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateModuloDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @ApiProperty({
    description: 'Nombre del módulo',
    example: 'Usuarios',
    maxLength: 100,
  })
  Nombre: string;
}
