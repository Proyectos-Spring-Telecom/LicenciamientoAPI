import { ApiProperty } from '@nestjs/swagger';

export class DashboardEstadisticaOperativaDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 12,
    description: 'Número del mes.',
  })
  numeroMes: number;

  @ApiProperty({
    example: 'Enero',
    description: 'Nombre del mes en español.',
  })
  mes: string;

  @ApiProperty({
    example: 4,
    description: 'Registros con estatus 1: Información Faltante.',
  })
  informacionFaltante: number;

  @ApiProperty({
    example: 2,
    description: 'Registros con estatus 2: Rechazo o Sin respuesta.',
  })
  rechazoSinRespuesta: number;

  @ApiProperty({
    example: 10,
    description: 'Registros con estatus 3: Datos Correctos.',
  })
  datosCorrectos: number;

  @ApiProperty({
    example: 3,
    description: 'Registros con estatus 4: Revisión.',
  })
  revision: number;

  @ApiProperty({
    example: 1,
    description: 'Registros con estatus 5: Baja.',
  })
  baja: number;

  @ApiProperty({
    example: 20,
    description: 'Cantidad total de registros del mes.',
  })
  totalRegistros: number;
}
