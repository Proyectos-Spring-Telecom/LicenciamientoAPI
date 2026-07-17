import { ApiProperty } from '@nestjs/swagger';
import { DashboardCardResponseDto } from './dashboard-card-response.dto';
import { DashboardEstadisticaOperativaDto } from './dashboard-estadistica-operativa.dto';
import { DashboardEstadoActualDto } from './dashboard-estado-actual.dto';
import { DashboardRegistroCapturistaDto } from './dashboard-registro-capturista.dto';

export class DashboardResponseDto {
  @ApiProperty({
    type: DashboardCardResponseDto,
    description: 'Conteos globales de registros por estatus para las tarjetas.',
    example: {
      totalRegistros: 150,
      informacionFaltante: 20,
      rechazoSinRespuesta: 15,
      datosCorrectos: 80,
      revision: 25,
      baja: 10,
    },
  })
  card: DashboardCardResponseDto;

  @ApiProperty({
    type: [DashboardEstadisticaOperativaDto],
    description:
      'Conteo mensual de registros por estatus correspondiente al año actual. Siempre contiene doce elementos.',
    example: [
      {
        numeroMes: 1,
        mes: 'Enero',
        informacionFaltante: 4,
        rechazoSinRespuesta: 2,
        datosCorrectos: 10,
        revision: 3,
        baja: 1,
        totalRegistros: 20,
      },
      {
        numeroMes: 2,
        mes: 'Febrero',
        informacionFaltante: 0,
        rechazoSinRespuesta: 0,
        datosCorrectos: 0,
        revision: 0,
        baja: 0,
        totalRegistros: 0,
      },
    ],
  })
  estadisticaOperativa: DashboardEstadisticaOperativaDto[];

  @ApiProperty({
    type: DashboardEstadoActualDto,
    description:
      'Conteos de registros creados durante el día actual, agrupados por estatus.',
    example: {
      fecha: '2026-07-16',
      totalRegistros: 18,
      informacionFaltante: 3,
      rechazoSinRespuesta: 2,
      datosCorrectos: 8,
      revision: 4,
      baja: 1,
    },
  })
  estadoActual: DashboardEstadoActualDto;

  @ApiProperty({
    type: [DashboardRegistroCapturistaDto],
    description:
      'Cantidad de registros realizados por cada capturista, ordenados de mayor a menor.',
    example: [
      {
        idCapturista: 25,
        nombre: 'Juan',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'López',
        nombreCompleto: 'Juan Pérez López',
        idGrupo: 3,
        grupo: 'Grupo Centro',
        totalRegistros: 48,
      },
      {
        idCapturista: 19,
        nombre: 'María',
        apellidoPaterno: 'García',
        apellidoMaterno: null,
        nombreCompleto: 'María García',
        idGrupo: null,
        grupo: null,
        totalRegistros: 36,
      },
    ],
  })
  registrosCapturistas: DashboardRegistroCapturistaDto[];
}
