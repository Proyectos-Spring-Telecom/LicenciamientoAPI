import { ApiProperty } from '@nestjs/swagger';
import { CapturaPeriodoItemDto } from './captura-periodo-item.dto';

export class CapturaPeriodoResponseDto {
  @ApiProperty({
    description:
      'Totales diarios de registros capturados y desglose por estatus',
    type: [CapturaPeriodoItemDto],
    example: [
      {
        fecha: '2026-07-01',
        total: 12,
        estatus: {
          informacionFaltante: 2,
          rechazoSinRespuesta: 1,
          datosCorrectos: 5,
          revision: 3,
          baja: 1,
        },
      },
      {
        fecha: '2026-07-02',
        total: 8,
        estatus: {
          informacionFaltante: 0,
          rechazoSinRespuesta: 2,
          datosCorrectos: 3,
          revision: 2,
          baja: 1,
        },
      },
    ],
  })
  capturaPeriodo: CapturaPeriodoItemDto[];
}
