import { ApiProperty } from '@nestjs/swagger';

export class DashboardCardResponseDto {
  @ApiProperty({
    example: 150,
    description:
      'Cantidad total de registros desde el primer registro hasta la fecha actual.',
  })
  totalRegistros: number;

  @ApiProperty({
    example: 20,
    description:
      'Cantidad de registros con estatus 1: Información Faltante.',
  })
  informacionFaltante: number;

  @ApiProperty({
    example: 15,
    description:
      'Cantidad de registros con estatus 2: Rechazo o Sin respuesta.',
  })
  rechazoSinRespuesta: number;

  @ApiProperty({
    example: 80,
    description: 'Cantidad de registros con estatus 3: Datos Correctos.',
  })
  datosCorrectos: number;

  @ApiProperty({
    example: 25,
    description: 'Cantidad de registros con estatus 4: Revisión.',
  })
  revision: number;

  @ApiProperty({
    example: 10,
    description: 'Cantidad de registros con estatus 5: Baja.',
  })
  baja: number;
}
