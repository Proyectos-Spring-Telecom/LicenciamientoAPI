import { describe, expect, it, jest } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CapturaPeriodoRequestDto } from './dto/captura-periodo-request.dto';
import { CapturaPeriodoResponseDto } from './dto/captura-periodo-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { CapturaPeriodoService } from './services/captura-periodo.service';

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
      .mockResolvedValueOnce(capturistasRows);
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
    expect(query.mock.calls[2][0]).toContain('DATE_FORMAT(CURDATE(),');
    expect(query.mock.calls[3][0]).toContain('FROM CapturistaVisita visita');

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
      registrosCapturistas: [],
    });

    const keys = Object.keys(result);
    expect(keys).toEqual([
      'card',
      'estadisticaOperativa',
      'estadoActual',
      'registrosCapturistas',
    ]);
    expect(result).not.toHaveProperty('capturaPeriodo');
    expect(result.estadisticaOperativa).toHaveLength(12);
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
      registrosCapturistas: [],
    });
    expect(result).not.toHaveProperty('capturaPeriodo');
  });

  it('no ejecuta CapturaPeriodoService ni consultas de periodo', async () => {
    const { service, query } = createService([{ totalRegistros: 0 }], []);

    await service.getCard();

    expect(query).toHaveBeenCalledTimes(4);
    for (const call of query.mock.calls) {
      expect(String(call[0])).not.toContain(
        "GROUP BY DATE_FORMAT(DATE(r.FechaCreacion), '%Y-%m-%d')",
      );
    }
  });

  it('devuelve registrosCapturistas agrupados con nombre completo', async () => {
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
      ],
    );

    const result = await service.getCard();
    const capturistasSql = String(query.mock.calls[3][0]);

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
    ]);
    expect(capturistasSql).toContain('LEFT JOIN Grupos g');
    expect(result).not.toHaveProperty('capturaPeriodo');
  });
});

describe('DashboardController', () => {
  it('conserva POST /dashboard/card sin body ni capturaPeriodo', async () => {
    const response = {
      card: {},
      estadisticaOperativa: [],
      estadoActual: {},
      registrosCapturistas: [],
    } as unknown as DashboardResponseDto;
    const getCard = jest
      .fn<DashboardService['getCard']>()
      .mockResolvedValue(response);
    const obtenerCapturaPeriodo = jest.fn();
    const controller = new DashboardController(
      { getCard } as unknown as DashboardService,
      { obtenerCapturaPeriodo } as unknown as CapturaPeriodoService,
    );

    await expect(controller.getCard()).resolves.toBe(response);
    expect(getCard).toHaveBeenCalledWith();
    expect(obtenerCapturaPeriodo).not.toHaveBeenCalled();
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

  it('POST /dashboard/captura-periodo delega al CapturaPeriodoService', async () => {
    const response = {
      capturaPeriodo: [
        {
          fecha: '2026-07-01',
          total: 6,
          estatus: {
            informacionFaltante: 2,
            rechazoSinRespuesta: 1,
            datosCorrectos: 1,
            revision: 1,
            baja: 1,
          },
        },
      ],
    } as CapturaPeriodoResponseDto;
    const obtenerCapturaPeriodo = jest
      .fn<CapturaPeriodoService['obtenerCapturaPeriodo']>()
      .mockResolvedValue(response);
    const controller = new DashboardController(
      { getCard: jest.fn() } as unknown as DashboardService,
      { obtenerCapturaPeriodo } as unknown as CapturaPeriodoService,
    );
    const dto: CapturaPeriodoRequestDto = {
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-10',
    };

    await expect(controller.obtenerCapturaPeriodo(dto)).resolves.toBe(response);
    expect(obtenerCapturaPeriodo).toHaveBeenCalledWith(dto);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        DashboardController.prototype.obtenerCapturaPeriodo,
      ),
    ).toBe('captura-periodo');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        DashboardController.prototype.obtenerCapturaPeriodo,
      ),
    ).toBe(RequestMethod.POST);
  });
});

describe('CapturaPeriodoRequestDto', () => {
  it('acepta fechas YYYY-MM-DD válidas', async () => {
    const dto = plainToInstance(CapturaPeriodoRequestDto, {
      fechaInicial: '2026-07-01',
      fechaFinal: '2026-07-10',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it.each([
    ['16/07/2026', '2026-07-16'],
    ['2026-07-01T00:00:00.000Z', '2026-07-16'],
    ['fecha-invalida', '2026-07-10'],
  ])('rechaza fechas inválidas %p / %p', async (fechaInicial, fechaFinal) => {
    const dto = plainToInstance(CapturaPeriodoRequestDto, {
      fechaInicial,
      fechaFinal,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
