import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CapturaPeriodoItemDto } from '../dto/captura-periodo-item.dto';
import { CapturaPeriodoRequestDto } from '../dto/captura-periodo-request.dto';
import { CapturaPeriodoResponseDto } from '../dto/captura-periodo-response.dto';

type CapturaPeriodoRawRow = {
  fecha?: string | null;
  total?: string | number | null;
  informacionFaltante?: string | number | null;
  rechazoSinRespuesta?: string | number | null;
  datosCorrectos?: string | number | null;
  revision?: string | number | null;
  baja?: string | number | null;
};

/**
 * Totales diarios de captura dentro de un periodo.
 * Encapsula filtros, visita vigente y agregación por día/estatus.
 */
@Injectable()
export class CapturaPeriodoService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Devuelve un elemento por cada día con al menos un registro.
   * Si no hay coincidencias, capturaPeriodo es [].
   */
  async obtenerCapturaPeriodo(
    dto: CapturaPeriodoRequestDto,
  ): Promise<CapturaPeriodoResponseDto> {
    const { fechaInicial, fechaFinal, idGrupo, idCapturista } = dto;

    if (fechaFinal < fechaInicial) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final',
      );
    }

    const filtraVisita = idGrupo !== undefined || idCapturista !== undefined;
    const condiciones = [
      'r.FechaCreacion >= ?',
      'r.FechaCreacion < DATE_ADD(?, INTERVAL 1 DAY)',
    ];
    const parametros: Array<string | number> = [fechaInicial, fechaFinal];

    if (idGrupo !== undefined) {
      condiciones.push('cv.IdGrupo = ?');
      parametros.push(idGrupo);
    }

    if (idCapturista !== undefined) {
      condiciones.push('cv.IdCapturista = ?');
      parametros.push(idCapturista);
    }

    const joinVisitaVigente = filtraVisita
      ? `
        INNER JOIN (
          SELECT
            visita.IdRegistro,
            visita.IdGrupo,
            visita.IdCapturista,
            ROW_NUMBER() OVER (
              PARTITION BY visita.IdRegistro
              ORDER BY visita.FechaHora DESC, visita.Id DESC
            ) AS numeroFila
          FROM CapturistaVisita visita
        ) cv
          ON cv.IdRegistro = r.Id
         AND cv.numeroFila = 1
      `
      : '';

    const fechaDiaExpression = `DATE_FORMAT(DATE(r.FechaCreacion), '%Y-%m-%d')`;
    const totalExpression = filtraVisita ? 'COUNT(DISTINCT r.Id)' : 'COUNT(*)';
    const statusExpression = (estatus: number) =>
      filtraVisita
        ? `COUNT(DISTINCT CASE WHEN r.Estatus = ${estatus} THEN r.Id END)`
        : `COALESCE(SUM(CASE WHEN r.Estatus = ${estatus} THEN 1 ELSE 0 END), 0)`;

    const query = `
      SELECT
        ${fechaDiaExpression} AS fecha,
        ${totalExpression} AS total,
        ${statusExpression(1)} AS informacionFaltante,
        ${statusExpression(2)} AS rechazoSinRespuesta,
        ${statusExpression(3)} AS datosCorrectos,
        ${statusExpression(4)} AS revision,
        ${statusExpression(5)} AS baja
      FROM Registros r
      ${joinVisitaVigente}
      WHERE ${condiciones.join(' AND ')}
      GROUP BY ${fechaDiaExpression}
      ORDER BY ${fechaDiaExpression} ASC
    `;

    const rows = (await this.dataSource.query(
      query,
      parametros,
    )) as CapturaPeriodoRawRow[];

    return {
      capturaPeriodo: this.mapRows(rows ?? []),
    };
  }

  private mapRows(rows: CapturaPeriodoRawRow[]): CapturaPeriodoItemDto[] {
    return rows.map((row) => ({
      fecha: String(row.fecha ?? ''),
      total: Number(row.total ?? 0),
      estatus: {
        informacionFaltante: Number(row.informacionFaltante ?? 0),
        rechazoSinRespuesta: Number(row.rechazoSinRespuesta ?? 0),
        datosCorrectos: Number(row.datosCorrectos ?? 0),
        revision: Number(row.revision ?? 0),
        baja: Number(row.baja ?? 0),
      },
    }));
  }
}
