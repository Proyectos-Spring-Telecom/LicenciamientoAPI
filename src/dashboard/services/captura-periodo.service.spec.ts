import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturaPeriodoService } from './captura-periodo.service';

const userRol4: AuthenticatedUser = {
  userId: 1,
  email: 'admin@test.com',
  idGrupo: null,
  rol: 4,
};

const userRol2Grupo1: AuthenticatedUser = {
  userId: 3,
  email: 'sup1@test.com',
  idGrupo: 1,
  rol: 2,
};

const userRol2Grupo2: AuthenticatedUser = {
  userId: 7,
  email: 'sup2@test.com',
  idGrupo: 2,
  rol: 2,
};

const userRol2SinGrupo: AuthenticatedUser = {
  userId: 4,
  email: 'sup-sin@test.com',
  idGrupo: null,
  rol: 2,
};

const userRol1: AuthenticatedUser = {
  userId: 5,
  email: 'cap@test.com',
  idGrupo: 1,
  rol: 1,
};

describe('CapturaPeriodoService.obtenerCapturaPeriodo', () => {
  function createService(rows?: Record<string, unknown>[]) {
    const query = jest
      .fn<
        (
          sql: string,
          parameters?: unknown[],
        ) => Promise<Record<string, unknown>[] | undefined>
      >()
      .mockResolvedValue(rows);
    const service = new CapturaPeriodoService({
      query,
    } as unknown as DataSource);

    return { service, query };
  }

  it('lanza 400 cuando la fecha inicial es posterior a la final', async () => {
    const { service, query } = createService();

    await expect(
      service.obtenerCapturaPeriodo(
        {
          fechaInicial: '2026-07-10',
          fechaFinal: '2026-07-01',
        },
        userRol4,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('mapea totales diarios y desglose por estatus con conversión numérica', async () => {
    const { service, query } = createService([
      {
        fecha: '2026-07-01',
        total: '6',
        informacionFaltante: '2',
        rechazoSinRespuesta: '1',
        datosCorrectos: '1',
        revision: '1',
        baja: '1',
      },
      {
        fecha: '2026-07-02',
        total: '8',
        informacionFaltante: '0',
        rechazoSinRespuesta: '2',
        datosCorrectos: '3',
        revision: '2',
        baja: '1',
      },
    ]);

    const result = await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-02',
      },
      userRol4,
    );
    const [sql, parameters] = query.mock.calls[0];

    expect(query).toHaveBeenCalledTimes(1);
    expect(sql).toContain(
      "GROUP BY DATE_FORMAT(DATE(r.FechaCreacion), '%Y-%m-%d')",
    );
    expect(sql).not.toContain('cv_scope');
    expect(parameters).toEqual(['2026-07-01', '2026-07-02']);
    expect(result).toEqual({
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
    });
    expect(typeof result.capturaPeriodo[0].total).toBe('number');
    expect(typeof result.capturaPeriodo[0].estatus.revision).toBe('number');
  });

  it('conserva total mayor que la suma cuando hay estatus desconocidos', async () => {
    const { service } = createService([
      {
        fecha: '2026-07-01',
        total: '13',
        informacionFaltante: '2',
        rechazoSinRespuesta: '1',
        datosCorrectos: '5',
        revision: '3',
        baja: '1',
      },
    ]);

    const result = await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-01',
      },
      userRol4,
    );
    const dia = result.capturaPeriodo[0];
    const suma =
      dia.estatus.informacionFaltante +
      dia.estatus.rechazoSinRespuesta +
      dia.estatus.datosCorrectos +
      dia.estatus.revision +
      dia.estatus.baja;

    expect(dia.total).toBe(13);
    expect(suma).toBe(12);
  });

  it('devuelve arreglo vacío cuando no hay coincidencias', async () => {
    const { service } = createService([]);

    await expect(
      service.obtenerCapturaPeriodo(
        {
          fechaInicial: '2026-07-01',
          fechaFinal: '2026-07-05',
        },
        userRol4,
      ),
    ).resolves.toEqual({ capturaPeriodo: [] });
  });

  it('aplica filtros de visita vigente en una sola consulta agregada', async () => {
    const { service, query } = createService([]);

    await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-10',
        idGrupo: 3,
        idCapturista: 25,
      },
      userRol4,
    );

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain(
      "GROUP BY DATE_FORMAT(DATE(r.FechaCreacion), '%Y-%m-%d')",
    );
    expect(sql).toContain('cv.IdGrupo = ?');
    expect(sql).toContain('cv.IdCapturista = ?');
    expect(sql).toContain('COUNT(DISTINCT r.Id)');
    expect(parameters).toEqual(['2026-07-01', '2026-07-10', 3, 25]);
  });

  it('rol 2 aplica EXISTS con IdGrupo del token', async () => {
    const { service, query } = createService([]);

    const result = await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-10',
      },
      userRol2Grupo1,
    );

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('FROM CapturistaVisita cv_scope');
    expect(sql).toContain('cv_scope.IdGrupo = ?');
    expect(parameters).toEqual(['2026-07-01', '2026-07-10', 1]);
    expect(Object.keys(result)).toEqual(['capturaPeriodo']);
  });

  it('rol 2 con idGrupo del mismo token permite el filtro funcional', async () => {
    const { service, query } = createService([]);

    await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-10',
        idGrupo: 1,
      },
      userRol2Grupo1,
    );

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('cv_scope.IdGrupo = ?');
    expect(sql).toContain('cv.IdGrupo = ?');
    expect(parameters).toEqual(['2026-07-01', '2026-07-10', 1, 1]);
  });

  it('rol 2 con idGrupo de otro grupo responde 403', async () => {
    const { service, query } = createService([]);

    await expect(
      service.obtenerCapturaPeriodo(
        {
          fechaInicial: '2026-07-01',
          fechaFinal: '2026-07-10',
          idGrupo: 2,
        },
        userRol2Grupo1,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rol 2 grupo 2 usa su propio IdGrupo en SQL', async () => {
    const { service, query } = createService([]);

    await service.obtenerCapturaPeriodo(
      {
        fechaInicial: '2026-07-01',
        fechaFinal: '2026-07-05',
      },
      userRol2Grupo2,
    );

    expect(query.mock.calls[0][1]).toEqual(['2026-07-01', '2026-07-05', 2]);
  });

  it('rol 2 sin grupo responde 403', async () => {
    const { service, query } = createService();

    await expect(
      service.obtenerCapturaPeriodo(
        {
          fechaInicial: '2026-07-01',
          fechaFinal: '2026-07-10',
        },
        userRol2SinGrupo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rol 1 responde 403', async () => {
    const { service, query } = createService();

    await expect(
      service.obtenerCapturaPeriodo(
        {
          fechaInicial: '2026-07-01',
          fechaFinal: '2026-07-10',
        },
        userRol1,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });
});
