import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DashboardEstadisticaOperativaDto } from './dto/dashboard-estadistica-operativa.dto';
import { DashboardRegistroCapturistaDto } from './dto/dashboard-registro-capturista.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

type CardRawRow = {
  totalRegistros?: string | number | null;
  informacionFaltante?: string | number | null;
  rechazoSinRespuesta?: string | number | null;
  datosCorrectos?: string | number | null;
  revision?: string | number | null;
  baja?: string | number | null;
};

type MonthlyRawRow = CardRawRow & {
  numeroMes?: string | number | null;
};

type CurrentDayRawRow = CardRawRow & {
  fecha?: string | null;
};

type DashboardRegistroCapturistaRaw = {
  idCapturista: string | number;
  nombre: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  idGrupo: string | number | null;
  grupo: string | null;
  totalRegistros: string | number | null;
};

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Conteos globales, estadística mensual, estado diario
   * y registros agrupados por capturista (visita vigente).
   */
  async getCard(): Promise<DashboardResponseDto> {
    try {
      const [
        cardRows,
        estadisticaRows,
        estadoActualRows,
        registrosCapturistasRows,
      ] = await Promise.all([
        this.dataSource.query(this.getCardQuery()) as Promise<CardRawRow[]>,
        this.dataSource.query(this.getEstadisticaOperativaQuery()) as Promise<
          MonthlyRawRow[]
        >,
        this.dataSource.query(this.getEstadoActualQuery()) as Promise<
          CurrentDayRawRow[]
        >,
        this.dataSource.query(this.getRegistrosCapturistasQuery()) as Promise<
          DashboardRegistroCapturistaRaw[]
        >,
      ]);

      return {
        card: this.mapCard(cardRows?.[0]),
        estadisticaOperativa: this.buildEstadisticaOperativa(
          estadisticaRows ?? [],
        ),
        estadoActual: this.mapEstadoActual(estadoActualRows?.[0]),
        registrosCapturistas: this.mapRegistrosCapturistas(
          registrosCapturistasRows ?? [],
        ),
      };
    } catch (error) {
      this.logger.error(
        'Error al obtener los indicadores del dashboard',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private mapCard(row?: CardRawRow) {
    return {
      totalRegistros: Number(row?.totalRegistros ?? 0),
      informacionFaltante: Number(row?.informacionFaltante ?? 0),
      rechazoSinRespuesta: Number(row?.rechazoSinRespuesta ?? 0),
      datosCorrectos: Number(row?.datosCorrectos ?? 0),
      revision: Number(row?.revision ?? 0),
      baja: Number(row?.baja ?? 0),
    };
  }

  private mapEstadoActual(row?: CurrentDayRawRow) {
    return {
      fecha: String(row?.fecha ?? ''),
      totalRegistros: Number(row?.totalRegistros ?? 0),
      informacionFaltante: Number(row?.informacionFaltante ?? 0),
      rechazoSinRespuesta: Number(row?.rechazoSinRespuesta ?? 0),
      datosCorrectos: Number(row?.datosCorrectos ?? 0),
      revision: Number(row?.revision ?? 0),
      baja: Number(row?.baja ?? 0),
    };
  }

  private mapRegistrosCapturistas(
    rows: DashboardRegistroCapturistaRaw[],
  ): DashboardRegistroCapturistaDto[] {
    return rows.map((row) => ({
      idCapturista: Number(row.idCapturista),
      nombre: row.nombre ?? null,
      apellidoPaterno: row.apellidoPaterno ?? null,
      apellidoMaterno: row.apellidoMaterno ?? null,
      nombreCompleto: this.buildFullName(
        row.nombre,
        row.apellidoPaterno,
        row.apellidoMaterno,
      ),
      idGrupo: row.idGrupo == null ? null : Number(row.idGrupo),
      grupo: row.grupo ?? null,
      totalRegistros: Number(row.totalRegistros ?? 0),
    }));
  }

  private buildFullName(
    nombre?: string | null,
    apellidoPaterno?: string | null,
    apellidoMaterno?: string | null,
  ): string | null {
    const partes = [nombre, apellidoPaterno, apellidoMaterno]
      .filter(
        (valor) =>
          valor !== null && valor !== undefined && String(valor).trim() !== '',
      )
      .map((valor) => String(valor).trim());

    return partes.length > 0 ? partes.join(' ') : null;
  }

  private buildEstadisticaOperativa(
    rows: MonthlyRawRow[],
  ): DashboardEstadisticaOperativaDto[] {
    const rowsByMonth = new Map<number, MonthlyRawRow>();

    for (const row of rows) {
      const numeroMes = Number(row.numeroMes);
      if (numeroMes >= 1 && numeroMes <= 12 && !rowsByMonth.has(numeroMes)) {
        rowsByMonth.set(numeroMes, row);
      }
    }

    return MESES.map((mes, index) => {
      const numeroMes = index + 1;
      const row = rowsByMonth.get(numeroMes);

      return {
        numeroMes,
        mes,
        informacionFaltante: Number(row?.informacionFaltante ?? 0),
        rechazoSinRespuesta: Number(row?.rechazoSinRespuesta ?? 0),
        datosCorrectos: Number(row?.datosCorrectos ?? 0),
        revision: Number(row?.revision ?? 0),
        baja: Number(row?.baja ?? 0),
        totalRegistros: Number(row?.totalRegistros ?? 0),
      };
    });
  }

  private getCardQuery(): string {
    return `
      SELECT
        COUNT(*) AS totalRegistros,
        COALESCE(SUM(CASE WHEN Estatus = 1 THEN 1 ELSE 0 END), 0)
          AS informacionFaltante,
        COALESCE(SUM(CASE WHEN Estatus = 2 THEN 1 ELSE 0 END), 0)
          AS rechazoSinRespuesta,
        COALESCE(SUM(CASE WHEN Estatus = 3 THEN 1 ELSE 0 END), 0)
          AS datosCorrectos,
        COALESCE(SUM(CASE WHEN Estatus = 4 THEN 1 ELSE 0 END), 0)
          AS revision,
        COALESCE(SUM(CASE WHEN Estatus = 5 THEN 1 ELSE 0 END), 0)
          AS baja
      FROM Registros
      WHERE FechaCreacion <= NOW()
    `;
  }

  private getEstadisticaOperativaQuery(): string {
    return `
      SELECT
        MONTH(FechaCreacion) AS numeroMes,
        COUNT(*) AS totalRegistros,
        COALESCE(SUM(CASE WHEN Estatus = 1 THEN 1 ELSE 0 END), 0)
          AS informacionFaltante,
        COALESCE(SUM(CASE WHEN Estatus = 2 THEN 1 ELSE 0 END), 0)
          AS rechazoSinRespuesta,
        COALESCE(SUM(CASE WHEN Estatus = 3 THEN 1 ELSE 0 END), 0)
          AS datosCorrectos,
        COALESCE(SUM(CASE WHEN Estatus = 4 THEN 1 ELSE 0 END), 0)
          AS revision,
        COALESCE(SUM(CASE WHEN Estatus = 5 THEN 1 ELSE 0 END), 0)
          AS baja
      FROM Registros
      WHERE FechaCreacion >= MAKEDATE(YEAR(CURDATE()), 1)
        AND FechaCreacion < MAKEDATE(YEAR(CURDATE()) + 1, 1)
      GROUP BY MONTH(FechaCreacion)
      ORDER BY MONTH(FechaCreacion) ASC
    `;
  }

  private getEstadoActualQuery(): string {
    return `
      SELECT
        DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS fecha,
        COUNT(*) AS totalRegistros,
        COALESCE(SUM(CASE WHEN Estatus = 1 THEN 1 ELSE 0 END), 0)
          AS informacionFaltante,
        COALESCE(SUM(CASE WHEN Estatus = 2 THEN 1 ELSE 0 END), 0)
          AS rechazoSinRespuesta,
        COALESCE(SUM(CASE WHEN Estatus = 3 THEN 1 ELSE 0 END), 0)
          AS datosCorrectos,
        COALESCE(SUM(CASE WHEN Estatus = 4 THEN 1 ELSE 0 END), 0)
          AS revision,
        COALESCE(SUM(CASE WHEN Estatus = 5 THEN 1 ELSE 0 END), 0)
          AS baja
      FROM Registros
      WHERE FechaCreacion >= CURDATE()
        AND FechaCreacion < CURDATE() + INTERVAL 1 DAY
    `;
  }

  private getRegistrosCapturistasQuery(): string {
    return `
      SELECT
        cv.IdCapturista AS idCapturista,
        u.Nombre AS nombre,
        u.ApellidoPaterno AS apellidoPaterno,
        u.ApellidoMaterno AS apellidoMaterno,
        cv.IdGrupo AS idGrupo,
        g.Nombre AS grupo,
        COUNT(DISTINCT r.Id) AS totalRegistros
      FROM Registros r
      INNER JOIN (
        SELECT
          visita.Id,
          visita.IdRegistro,
          visita.IdCapturista,
          visita.IdGrupo,
          visita.FechaHora,
          ROW_NUMBER() OVER (
            PARTITION BY visita.IdRegistro
            ORDER BY
              visita.FechaHora DESC,
              visita.Id DESC
          ) AS numeroFila
        FROM CapturistaVisita visita
      ) cv
        ON cv.IdRegistro = r.Id
       AND cv.numeroFila = 1
      LEFT JOIN Usuarios u
        ON u.Id = cv.IdCapturista
      LEFT JOIN Grupos g
        ON g.Id = cv.IdGrupo
      WHERE r.FechaCreacion <= NOW()
        AND cv.IdCapturista IS NOT NULL
      GROUP BY
        cv.IdCapturista,
        u.Nombre,
        u.ApellidoPaterno,
        u.ApellidoMaterno,
        cv.IdGrupo,
        g.Nombre
      ORDER BY
        totalRegistros DESC,
        u.Nombre ASC,
        u.ApellidoPaterno ASC,
        u.ApellidoMaterno ASC,
        cv.IdGrupo ASC,
        cv.IdCapturista ASC
    `;
  }
}
