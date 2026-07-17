import { ApiProperty } from '@nestjs/swagger';

export class CapturaPeriodoEstatusDto {
  @ApiProperty({
    description: 'Total de registros con estatus 1: Información faltante',
    example: 2,
  })
  informacionFaltante: number;

  @ApiProperty({
    description: 'Total de registros con estatus 2: Rechazo o sin respuesta',
    example: 1,
  })
  rechazoSinRespuesta: number;

  @ApiProperty({
    description: 'Total de registros con estatus 3: Datos correctos',
    example: 5,
  })
  datosCorrectos: number;

  @ApiProperty({
    description: 'Total de registros con estatus 4: Revisión',
    example: 3,
  })
  revision: number;

  @ApiProperty({
    description: 'Total de registros con estatus 5: Baja',
    example: 1,
  })
  baja: number;
}

export class CapturaPeriodoItemDto {
  @ApiProperty({
    description: 'Fecha agrupada del periodo en formato YYYY-MM-DD',
    example: '2026-07-01',
  })
  fecha: string;

  @ApiProperty({
    description: 'Total general de registros capturados durante el día',
    example: 12,
  })
  total: number;

  @ApiProperty({
    description: 'Totales de registros agrupados por estatus',
    type: CapturaPeriodoEstatusDto,
  })
  estatus: CapturaPeriodoEstatusDto;
}
