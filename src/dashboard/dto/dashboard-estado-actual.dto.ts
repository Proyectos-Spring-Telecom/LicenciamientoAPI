import { ApiProperty } from '@nestjs/swagger';

export class DashboardEstadoActualDto {
  @ApiProperty({
    example: '2026-07-16',
    description:
      'Fecha utilizada para el conteo diario, en formato YYYY-MM-DD.',
  })
  fecha: string;

  @ApiProperty({
    example: 18,
    description: 'Cantidad total de registros creados durante el día actual.',
  })
  totalRegistros: number;

  @ApiProperty({
    example: 3,
    description: 'Registros del día con estatus 1: Información Faltante.',
  })
  informacionFaltante: number;

  @ApiProperty({
    example: 2,
    description:
      'Registros del día con estatus 2: Rechazo o Sin respuesta.',
  })
  rechazoSinRespuesta: number;

  @ApiProperty({
    example: 8,
    description: 'Registros del día con estatus 3: Datos Correctos.',
  })
  datosCorrectos: number;

  @ApiProperty({
    example: 4,
    description: 'Registros del día con estatus 4: Revisión.',
  })
  revision: number;

  @ApiProperty({
    example: 1,
    description: 'Registros del día con estatus 5: Baja.',
  })
  baja: number;
}
