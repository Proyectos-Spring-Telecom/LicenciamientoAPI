import { describe, expect, it, jest } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

describe('DashboardService.getCard', () => {
  function createService(
    cardRows: Record<string, unknown>[] | undefined,
    monthlyRows: Record<string, unknown>[] | undefined = [],
    currentDayRows: Record<string, unknown>[] | undefined = [
      {
        fecha: '2026-07-16',
        totalRegistros: 0,
        informacionFaltante: 0,
        rechazoSinRespuesta: 0,
        datosCorrectos: 0,
        revision: 0,
        baja: 0,
      },
    ],
    capturistasRows: Record<string, unknown>[] | undefined = [],
    periodRows?: Record<string, unknown>[],
  ) {
    const query = jest
      .fn<
        (
          sql: string,
          parameters?: unknown[],
        ) => Promise<Record<string, unknown>[] | undefined>
      >()
      .mockResolvedValueOnce(cardRows)
      .mockResolvedValueOnce(monthlyRows)
      .mockResolvedValueOnce(currentDayRows)
      .mockResolvedValueOnce(capturistasRows)
      .mockResolvedValueOnce(periodRows);
    const service = new DashboardService({
      query,
    } as unknown as DataSource);

    return { service, query };
  }

  it('devuelve card y estadisticaOperativa con conteos numéricos', async () => {
    const { service, query } = createService(
      [
        {
          totalRegistros: '150',
          informacionFaltante: '20',
          rechazoSinRespuesta: '15',
          datosCorrectos: '80',
          revision: '25',
          baja: '10',
        },
      ],
      [
        {
          numeroMes: '1',
          totalRegistros: '20',
          informacionFaltante: '4',
          rechazoSinRespuesta: '2',
          datosCorrectos: '10',
          revision: '3',
          baja: '1',
        },
      ],
      [
        {
          fecha: '2026-07-16',
          totalRegistros: '18',
          informacionFaltante: '3',
          rechazoSinRespuesta: '2',
          datosCorrectos: '8',
          revision: '4',
          baja: '1',
        },
      ],
    );

    const result = await service.getCard();

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0][0]).toContain('FROM Registros');
    expect(query.mock.calls[0][0]).toContain('FechaCreacion <= NOW()');
    expect(query.mock.calls[1][0]).toContain('GROUP BY MONTH(FechaCreacion)');
    expect(query.mock.calls[1][0]).toContain(
      'FechaCreacion >= MAKEDATE(YEAR(CURDATE()), 1)',
    );
    expect(query.mock.calls[1][0]).toContain(
      'FechaCreacion < MAKEDATE(YEAR(CURDATE()) + 1, 1)',
    );
    expect(query.mock.calls[2][0]).toContain('DATE_FORMAT(CURDATE(),');
    expect(query.mock.calls[2][0]).toContain('FechaCreacion >= CURDATE()');
    expect(query.mock.calls[2][0]).toContain(
      'FechaCreacion < CURDATE() + INTERVAL 1 DAY',
    );
    expect(query.mock.calls[2][0]).not.toContain('DATE(FechaCreacion)');
    expect(query.mock.calls[3][0]).toContain('FROM CapturistaVisita visita');
    expect(query.mock.calls[3][0]).toContain('LEFT JOIN Usuarios u');

    expect(result).toEqual({
      card: {
        totalRegistros: 150,
        informacionFaltante: 20,
        rechazoSinRespuesta: 15,
        datosCorrectos: 80,
        revision: 25,
        baja: 10,
      },
      estadisticaOperativa: expect.any(Array),
      estadoActual: {
        fecha: '2026-07-16',
        totalRegistros: 18,
        informacionFaltante: 3,
        rechazoSinRespuesta: 2,
        datosCorrectos: 8,
        revision: 4,
        baja: 1,
      },
      capturaPeriodo: null,
      registrosCapturistas: [],
    });

    expect(typeof result.card.totalRegistros).toBe('number');
    expect(typeof result.card.informacionFaltante).toBe('number');
    expect(typeof result.card.rechazoSinRespuesta).toBe('number');
    expect(typeof result.card.datosCorrectos).toBe('number');
    expect(typeof result.card.revision).toBe('number');
    expect(typeof result.card.baja).toBe('number');

    const keys = Object.keys(result);
    expect(keys).toEqual([
      'card',
      'estadisticaOperativa',
      'estadoActual',
      'capturaPeriodo',
      'registrosCapturistas',
    ]);
    expect(result).not.toHaveProperty('cards');
    expect(result).not.toHaveProperty('tarjetas');
    expect(result.card).not.toHaveProperty('TotalRegistros');
    expect(result.card).not.toHaveProperty('total');

    expect(result.estadisticaOperativa).toHaveLength(12);
    expect(result.estadisticaOperativa[0]).toEqual({
      numeroMes: 1,
      mes: 'Enero',
      informacionFaltante: 4,
      rechazoSinRespuesta: 2,
      datosCorrectos: 10,
      revision: 3,
      baja: 1,
      totalRegistros: 20,
    });
    expect(typeof result.estadisticaOperativa[0].totalRegistros).toBe('number');
    expect(result.estadoActual.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const [key, value] of Object.entries(result.estadoActual)) {
      if (key !== 'fecha') {
        expect(typeof value).toBe('number');
      }
    }
  });

  it('mapea aliases de estatus 1–5 a los campos de card', async () => {
    const { service, query } = createService([
      {
        totalRegistros: 5,
        informacionFaltante: 1,
        rechazoSinRespuesta: 1,
        datosCorrectos: 1,
        revision: 1,
        baja: 1,
      },
    ]);

    const result = await service.getCard();

    const cardQuery = String(query.mock.calls[0][0]);
    expect(cardQuery).toContain('Estatus = 1');
    expect(cardQuery).toContain('AS informacionFaltante');
    expect(cardQuery).toContain('Estatus = 2');
    expect(cardQuery).toContain('AS rechazoSinRespuesta');
    expect(cardQuery).toContain('Estatus = 3');
    expect(cardQuery).toContain('AS datosCorrectos');
    expect(cardQuery).toContain('Estatus = 4');
    expect(cardQuery).toContain('AS revision');
    expect(cardQuery).toContain('Estatus = 5');
    expect(cardQuery).toContain('AS baja');

    expect(result.card).toEqual({
      totalRegistros: 5,
      informacionFaltante: 1,
      rechazoSinRespuesta: 1,
      datosCorrectos: 1,
      revision: 1,
      baja: 1,
    });
  });

  it('sin registros devuelve ceros, doce meses y estado diario estable', async () => {
    const { service } = createService(undefined, undefined, [
      {
        fecha: '2026-07-16',
        totalRegistros: 0,
        informacionFaltante: null,
        rechazoSinRespuesta: null,
        datosCorrectos: null,
        revision: null,
        baja: null,
      },
    ]);

    const result = await service.getCard();

    expect(result).toEqual({
      card: {
        totalRegistros: 0,
        informacionFaltante: 0,
        rechazoSinRespuesta: 0,
        datosCorrectos: 0,
        revision: 0,
        baja: 0,
      },
      estadisticaOperativa: expect.any(Array),
      estadoActual: {
        fecha: '2026-07-16',
        totalRegistros: 0,
        informacionFaltante: 0,
        rechazoSinRespuesta: 0,
        datosCorrectos: 0,
        revision: 0,
        baja: 0,
      },
      capturaPeriodo: null,
      registrosCapturistas: [],
    });

    for (const value of Object.values(result.card)) {
      expect(value).not.toBeNull();
      expect(typeof value).toBe('number');
    }
    expect(result.estadisticaOperativa).toHaveLength(12);
    for (const item of result.estadisticaOperativa) {
      expect(item.totalRegistros).toBe(0);
      expect(item.informacionFaltante).toBe(0);
      expect(item.rechazoSinRespuesta).toBe(0);
      expect(item.datosCorrectos).toBe(0);
      expect(item.revision).toBe(0);
      expect(item.baja).toBe(0);
    }
  });

  it('normaliza null de SUM a 0', async () => {
    const { service } = createService(
      [
        {
          totalRegistros: 0,
          informacionFaltante: null,
          rechazoSinRespuesta: null,
          datosCorrectos: null,
          revision: null,
          baja: null,
        },
      ],
      [
        {
          numeroMes: 3,
          totalRegistros: null,
          informacionFaltante: null,
          rechazoSinRespuesta: null,
          datosCorrectos: null,
          revision: null,
          baja: null,
        },
      ],
    );

    const result = await service.getCard();

    expect(result.card).toEqual({
      totalRegistros: 0,
      informacionFaltante: 0,
      rechazoSinRespuesta: 0,
      datosCorrectos: 0,
      revision: 0,
      baja: 0,
    });
    expect(result.estadisticaOperativa[2]).toEqual({
      numeroMes: 3,
      mes: 'Marzo',
      informacionFaltante: 0,
      rechazoSinRespuesta: 0,
      datosCorrectos: 0,
      revision: 0,
      baja: 0,
      totalRegistros: 0,
    });
  });

  it('totalRegistros puede superar la suma de estatus 1–5', async () => {
    const { service } = createService(
      [
        {
          totalRegistros: 12,
          informacionFaltante: 2,
          rechazoSinRespuesta: 2,
          datosCorrectos: 2,
          revision: 2,
          baja: 2,
        },
      ],
      [
        {
          numeroMes: 7,
          totalRegistros: 12,
          informacionFaltante: 2,
          rechazoSinRespuesta: 2,
          datosCorrectos: 2,
          revision: 2,
          baja: 2,
        },
      ],
    );

    const result = await service.getCard();
    const sumaEstatus =
      result.card.informacionFaltante +
      result.card.rechazoSinRespuesta +
      result.card.datosCorrectos +
      result.card.revision +
      result.card.baja;

    expect(result.card.totalRegistros).toBe(12);
    expect(sumaEstatus).toBe(10);
    expect(result.card.totalRegistros).toBeGreaterThan(sumaEstatus);
    expect(result.estadisticaOperativa[6].totalRegistros).toBe(12);
  });

  it('estadisticaOperativa contiene doce meses ordenados en español', async () => {
    const { service } = createService([{ totalRegistros: 0 }], []);

    const result = await service.getCard();

    expect(result.estadisticaOperativa.map((item) => item.numeroMes)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(result.estadisticaOperativa.map((item) => item.mes)).toEqual([
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
    ]);
    expect(result.estadisticaOperativa[0].numeroMes).toBe(1);
    expect(result.estadisticaOperativa[11].numeroMes).toBe(12);
  });

  it('mapea cada estatus mensual al campo correcto', async () => {
    const { service } = createService(
      [{ totalRegistros: 0 }],
      [
        {
          numeroMes: 2,
          totalRegistros: 24,
          informacionFaltante: 5,
          rechazoSinRespuesta: 1,
          datosCorrectos: 12,
          revision: 4,
          baja: 2,
        },
      ],
    );

    const result = await service.getCard();

    expect(result.estadisticaOperativa[1]).toEqual({
      numeroMes: 2,
      mes: 'Febrero',
      informacionFaltante: 5,
      rechazoSinRespuesta: 1,
      datosCorrectos: 12,
      revision: 4,
      baja: 2,
      totalRegistros: 24,
    });
  });

  it('ignora meses fuera de 1 a 12 y no duplica meses', async () => {
    const { service } = createService(
      [{ totalRegistros: 0 }],
      [
        { numeroMes: 0, totalRegistros: 99 },
        { numeroMes: 1, totalRegistros: 1 },
        { numeroMes: 1, totalRegistros: 2 },
        { numeroMes: 13, totalRegistros: 99 },
      ],
    );

    const result = await service.getCard();
    const numerosMes = result.estadisticaOperativa.map(
      (item) => item.numeroMes,
    );

    expect(new Set(numerosMes).size).toBe(12);
    expect(result.estadisticaOperativa).toHaveLength(12);
    expect(result.estadisticaOperativa[0].totalRegistros).toBe(1);
  });

  it('no realiza consultas por mes ni por estatus', async () => {
    const { service, query } = createService([{ totalRegistros: 0 }], []);

    await service.getCard();

    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[1][0])).toContain(
      'GROUP BY MONTH(FechaCreacion)',
    );
    expect(String(query.mock.calls[1][0])).not.toContain('SELECT *');
    expect(String(query.mock.calls[2][0])).not.toContain('SELECT *');
    expect(String(query.mock.calls[2][0])).toContain(
      'SUM(CASE WHEN Estatus = 1',
    );
  });

  it('estadoActual cuenta los cinco estatus y conserva otros solo en el total', async () => {
    const { service, query } = createService(
      [{ totalRegistros: 0 }],
      [],
      [
        {
          fecha: '2026-07-16',
          totalRegistros: '20',
          informacionFaltante: '3',
          rechazoSinRespuesta: '2',
          datosCorrectos: '8',
          revision: '4',
          baja: '1',
        },
      ],
    );

    const result = await service.getCard();
    const estado = result.estadoActual;
    const sumaCatalogo =
      estado.informacionFaltante +
      estado.rechazoSinRespuesta +
      estado.datosCorrectos +
      estado.revision +
      estado.baja;

    expect(estado).toEqual({
      fecha: '2026-07-16',
      totalRegistros: 20,
      informacionFaltante: 3,
      rechazoSinRespuesta: 2,
      datosCorrectos: 8,
      revision: 4,
      baja: 1,
    });
    expect(sumaCatalogo).toBe(18);
    expect(estado.totalRegistros).toBeGreaterThan(sumaCatalogo);

    const dailyQuery = String(query.mock.calls[2][0]);
    for (const estatus of [1, 2, 3, 4, 5]) {
      expect(dailyQuery).toContain(`Estatus = ${estatus}`);
    }
  });

  it('estadoActual no contiene aliases ni propiedades duplicadas', async () => {
    const { service } = createService(
      [{ totalRegistros: 0 }],
      [],
      [
        {
          fecha: '2026-07-16',
          totalRegistros: 1,
          informacionFaltante: 1,
          rechazoSinRespuesta: 0,
          datosCorrectos: 0,
          revision: 0,
          baja: 0,
        },
      ],
    );

    const result = await service.getCard();
    const keys = Object.keys(result.estadoActual);

    expect(keys).toEqual([
      'fecha',
      'totalRegistros',
      'informacionFaltante',
      'rechazoSinRespuesta',
      'datosCorrectos',
      'revision',
      'baja',
    ]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(result).not.toHaveProperty('estadoDiario');
    expect(result).not.toHaveProperty('registrosHoy');
    expect(result.estadoActual).not.toHaveProperty('fechaActual');
    expect(result.estadoActual).not.toHaveProperty('total');
    expect(result.estadoActual).not.toHaveProperty('totalHoy');
  });

  it.each([
    undefined,
    {},
    { fechaInicial: '2026-07-01' },
    { fechaFinal: '2026-07-16' },
    { idGrupo: 3 },
    { idCapturista: 25 },
    { idGrupo: 3, idCapturista: 25 },
    { fechaInicial: '2026-07-01', idGrupo: 3 },
  ])(
    'no consulta capturaPeriodo cuando faltan ambas fechas: %p',
    async (filters) => {
      const { service, query } = createService([{ totalRegistros: 0 }]);

      const result = await service.getCard(filters);

      expect(result.capturaPeriodo).toBeNull();
      expect(query).toHaveBeenCalledTimes(4);
    },
  );

  it('devuelve null y no consulta cuando el rango está invertido', async () => {
    const { service, query } = createService([{ totalRegistros: 0 }]);

    const result = await service.getCard({
      fechaInicial: '2026-07-20',
      fechaFinal: '2026-07-01',
    });

    expect(result.capturaPeriodo).toBeNull();
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('consulta el periodo inclusivo solo por fechas usando parámetros', async () => {
    const { service, query } = createService(
      [{ totalRegistros: '150' }],
      [],
      undefined,
      [],
      [
        {
          totalRegistros: '100',
          informacionFaltante: '20',
          rechazoSinRespuesta: '10',
          datosCorrectos: '50',
          revision: '15',
          baja: '5',
        },
      ],
    );

    const result = await service.getCard({
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-16',
    });
    const [sql, parameters] = query.mock.calls[4];

    expect(query).toHaveBeenCalledTimes(5);
    expect(sql).toContain('FROM Registros r');
    expect(sql).toContain('r.FechaCreacion >= ?');
    expect(sql).toContain('r.FechaCreacion < DATE_ADD(?, INTERVAL 1 DAY)');
    expect(sql).not.toContain('CapturistaVisita');
    expect(sql).not.toContain('2026-07-01');
    expect(sql).not.toContain('2026-07-16');
    expect(parameters).toEqual(['2026-07-01', '2026-07-16']);
    expect(result.capturaPeriodo).toEqual({
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-16',
      idGrupo: null,
      idCapturista: null,
      totalRegistros: 100,
      informacionFaltante: 20,
      rechazoSinRespuesta: 10,
      datosCorrectos: 50,
      revision: 15,
      baja: 5,
    });
    expect(result.card.totalRegistros).toBe(150);
  });

  it.each([
    [{ idGrupo: 3 }, 'cv.IdGrupo = ?', [3]],
    [{ idCapturista: 25 }, 'cv.IdCapturista = ?', [25]],
    [{ idGrupo: 3, idCapturista: 25 }, 'cv.IdGrupo = ?', [3, 25]],
  ] as const)(
    'aplica filtros de visita vigente sin duplicar registros: %p',
    async (visitFilters, expectedCondition, expectedParameters) => {
      const { service, query } = createService(
        [{ totalRegistros: 0 }],
        [],
        undefined,
        [],
        [{ totalRegistros: 0 }],
      );

      const result = await service.getCard({
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-16',
        ...visitFilters,
      });
      const [sql, parameters] = query.mock.calls[4];

      expect(sql).toContain('FROM CapturistaVisita visita');
      expect(sql).toContain('PARTITION BY visita.IdRegistro');
      expect(sql).toContain('ORDER BY visita.FechaHora DESC, visita.Id DESC');
      expect(sql).toContain('cv.numeroFila = 1');
      expect(sql).toContain('COUNT(DISTINCT r.Id)');
      expect(sql).toContain(expectedCondition);
      if ('idCapturista' in visitFilters) {
        expect(sql).toContain('cv.IdCapturista = ?');
      }
      expect(parameters).toEqual([
        '2026-07-01',
        '2026-07-16',
        ...expectedParameters,
      ]);
      expect(result.capturaPeriodo?.idGrupo).toBe(
        'idGrupo' in visitFilters ? visitFilters.idGrupo : null,
      );
      expect(result.capturaPeriodo?.idCapturista).toBe(
        'idCapturista' in visitFilters ? visitFilters.idCapturista : null,
      );
    },
  );

  it('normaliza a números y ceros el resultado sin coincidencias', async () => {
    const { service } = createService(
      [{ totalRegistros: 0 }],
      [],
      undefined,
      [],
      [
        {
          totalRegistros: '2',
          informacionFaltante: null,
          rechazoSinRespuesta: null,
          datosCorrectos: null,
          revision: null,
          baja: null,
        },
      ],
    );

    const result = await service.getCard({
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-16',
    });
    const captura = result.capturaPeriodo;

    expect(captura?.totalRegistros).toBe(2);
    expect(
      (captura?.informacionFaltante ?? 0) +
        (captura?.rechazoSinRespuesta ?? 0) +
        (captura?.datosCorrectos ?? 0) +
        (captura?.revision ?? 0) +
        (captura?.baja ?? 0),
    ).toBe(0);
    for (const value of Object.values(captura ?? {}).slice(4)) {
      expect(typeof value).toBe('number');
      expect(value).not.toBeNull();
    }
  });

  it.each([
    ['16/07/2026', '2026-07-16'],
    ['2026-07-01T00:00:00.000Z', '2026-07-16'],
    ['2026-02-30', '2026-07-16'],
  ])(
    'rechaza fechas que no son YYYY-MM-DD válidas',
    async (fechaInicial, fechaFinal) => {
      const dto = plainToInstance(DashboardFilterDto, {
        fechaInicial,
        fechaFinal,
      });

      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('transforma y valida identificadores enteros positivos', async () => {
    const validDto = plainToInstance(DashboardFilterDto, {
      idGrupo: '3',
      idCapturista: '25',
    });
    const invalidDto = plainToInstance(DashboardFilterDto, {
      idGrupo: 0,
      idCapturista: -1,
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(validDto).toMatchObject({ idGrupo: 3, idCapturista: 25 });
    expect(await validate(invalidDto)).not.toHaveLength(0);
  });

  it('devuelve registrosCapturistas agrupados con nombre completo y tipos numéricos', async () => {
    const { service, query } = createService(
      [{ totalRegistros: 0 }],
      [],
      undefined,
      [
        {
          idCapturista: '25',
          nombre: 'Juan',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: 'López',
          idGrupo: '3',
          grupo: 'Grupo Centro',
          totalRegistros: '30',
        },
        {
          idCapturista: '25',
          nombre: 'Juan',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: 'López',
          idGrupo: '5',
          grupo: null,
          totalRegistros: '18',
        },
        {
          idCapturista: '19',
          nombre: 'María',
          apellidoPaterno: 'García',
          apellidoMaterno: null,
          idGrupo: null,
          grupo: null,
          totalRegistros: '36',
        },
        {
          idCapturista: '7',
          nombre: null,
          apellidoPaterno: null,
          apellidoMaterno: null,
          idGrupo: null,
          grupo: null,
          totalRegistros: '2',
        },
      ],
      [{ totalRegistros: 1 }],
    );

    const result = await service.getCard({
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-16',
      idGrupo: 3,
    });
    const capturistasSql = String(query.mock.calls[3][0]);

    expect(Array.isArray(result.registrosCapturistas)).toBe(true);
    expect(result.registrosCapturistas).toEqual([
      {
        idCapturista: 25,
        nombre: 'Juan',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'López',
        nombreCompleto: 'Juan Pérez López',
        idGrupo: 3,
        grupo: 'Grupo Centro',
        totalRegistros: 30,
      },
      {
        idCapturista: 25,
        nombre: 'Juan',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'López',
        nombreCompleto: 'Juan Pérez López',
        idGrupo: 5,
        grupo: null,
        totalRegistros: 18,
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
      {
        idCapturista: 7,
        nombre: null,
        apellidoPaterno: null,
        apellidoMaterno: null,
        nombreCompleto: null,
        idGrupo: null,
        grupo: null,
        totalRegistros: 2,
      },
    ]);
    expect(typeof result.registrosCapturistas[0].idCapturista).toBe('number');
    expect(typeof result.registrosCapturistas[0].idGrupo).toBe('number');
    expect(typeof result.registrosCapturistas[0].totalRegistros).toBe('number');
    expect(result.registrosCapturistas[1].idGrupo).toBe(5);
    expect(result.registrosCapturistas[1].grupo).toBeNull();
    expect(result.registrosCapturistas[2].idGrupo).toBeNull();
    expect(result.registrosCapturistas[2].grupo).toBeNull();
    expect(capturistasSql).toContain('FROM CapturistaVisita visita');
    expect(capturistasSql).toContain('PARTITION BY visita.IdRegistro');
    expect(capturistasSql).toContain('visita.FechaHora DESC');
    expect(capturistasSql).toContain('visita.Id DESC');
    expect(capturistasSql).toContain('cv.numeroFila = 1');
    expect(capturistasSql).toContain('COUNT(DISTINCT r.Id)');
    expect(capturistasSql).toContain('cv.IdGrupo AS idGrupo');
    expect(capturistasSql).toContain('g.Nombre AS grupo');
    expect(capturistasSql).toContain('LEFT JOIN Usuarios u');
    expect(capturistasSql).toContain('LEFT JOIN Grupos g');
    expect(capturistasSql).toContain('r.FechaCreacion <= NOW()');
    expect(capturistasSql).toContain('totalRegistros DESC');
    expect(capturistasSql).toContain('cv.IdGrupo ASC');
    expect(capturistasSql).not.toContain('cv.IdGrupo = ?');
    expect(capturistasSql).not.toContain('2026-07-01');
    expect(capturistasSql).not.toContain('PasswordHash');
    expect(capturistasSql).not.toContain('RefreshToken');
    expect(query.mock.calls[3][1]).toBeUndefined();
    expect(result).not.toHaveProperty('capturistas');
    expect(result).not.toHaveProperty('capturasPorCapturista');
    expect(result.registrosCapturistas[0]).not.toHaveProperty('capturistaId');
    expect(result.registrosCapturistas[0]).not.toHaveProperty('grupoId');
    expect(result.registrosCapturistas[0]).not.toHaveProperty('IdGrupo');
    expect(result.registrosCapturistas[0]).not.toHaveProperty('nombreGrupo');
    expect(result.registrosCapturistas[0]).not.toHaveProperty('total');
    expect(Object.keys(result.registrosCapturistas[0])).toEqual([
      'idCapturista',
      'nombre',
      'apellidoPaterno',
      'apellidoMaterno',
      'nombreCompleto',
      'idGrupo',
      'grupo',
      'totalRegistros',
    ]);
    expect(result.capturaPeriodo).not.toBeNull();
    expect(result.capturaPeriodo?.totalRegistros).toBe(1);
  });

  it('sin capturistas asociados devuelve arreglo vacío', async () => {
    const { service } = createService(
      [{ totalRegistros: 0 }],
      [],
      undefined,
      [],
    );

    const result = await service.getCard();

    expect(result.registrosCapturistas).toEqual([]);
  });
});

describe('DashboardController.getCard', () => {
  it('conserva POST /dashboard/card y permite omitir el body', async () => {
    const response = {
      card: {},
      estadisticaOperativa: [],
      estadoActual: {},
      capturaPeriodo: null,
      registrosCapturistas: [],
    } as unknown as DashboardResponseDto;
    const getCard = jest
      .fn<DashboardService['getCard']>()
      .mockResolvedValue(response);
    const controller = new DashboardController({
      getCard,
    } as unknown as DashboardService);

    await expect(controller.getCard()).resolves.toBe(response);
    expect(getCard).toHaveBeenCalledWith({});
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe(
      'dashboard',
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, DashboardController.prototype.getCard),
    ).toBe('card');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        DashboardController.prototype.getCard,
      ),
    ).toBe(RequestMethod.POST);
  });
});
