import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';

export const REGISTRO_ESTATUS_PERMITIDOS = [1, 2, 3, 4, 5] as const;

export class UpdateRegistroEstatusDto {
  @ApiProperty({
    description: `Nuevo estatus:
1 = Información Faltante
2 = Rechazo o Sin respuesta
3 = Datos Correctos
4 = Revisión
5 = Baja`,
    enum: REGISTRO_ESTATUS_PERMITIDOS,
    enumName: 'RegistroEstatus',
    example: 3,
  })
  @IsInt({ message: 'El estatus debe ser un número entero.' })
  @IsIn(REGISTRO_ESTATUS_PERMITIDOS, {
    message:
      'El estatus debe ser uno de los siguientes valores: 1, 2, 3, 4 o 5.',
  })
  estatus: number;
}
