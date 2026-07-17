import { ApiProperty } from '@nestjs/swagger';

export class DashboardCapturaPeriodoDto {
  @ApiProperty({ example: '2026-07-01' })
  fechaInicial: string;

  @ApiProperty({ example: '2026-07-16' })
  fechaFinal: string;

  @ApiProperty({ example: 3, nullable: true })
  idGrupo: number | null;

  @ApiProperty({ example: 25, nullable: true })
  idCapturista: number | null;

  @ApiProperty({ example: 48 })
  totalRegistros: number;

  @ApiProperty({ example: 8 })
  informacionFaltante: number;

  @ApiProperty({ example: 4 })
  rechazoSinRespuesta: number;

  @ApiProperty({ example: 25 })
  datosCorrectos: number;

  @ApiProperty({ example: 9 })
  revision: number;

  @ApiProperty({ example: 2 })
  baja: number;
}
