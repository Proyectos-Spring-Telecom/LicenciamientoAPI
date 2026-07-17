import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Licencias } from 'src/entities/Licencias';
import { Registros } from 'src/entities/Registros';
import { GetRegistrosByDateRangeDto } from './dto/get-registros-by-date-range.dto';
import { GetRegistrosQueryDto } from './dto/get-registros-query.dto';
import {
  buildEndExclusiveDateLocal,
  buildStartDateLocal,
} from './registro-date-range';
import { RegistrosService } from './registros.service';

async function validateQuery(
  input: Record<string, unknown>,
): Promise<{ dto: GetRegistrosQueryDto; errors: string[] }> {
  const dto = plainToInstance(GetRegistrosQueryDto, input);
  const errors = await validate(dto);
  return {
    dto,
    errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
  };
}

async function validateRangeDto(
  input: Record<string, unknown>,
): Promise<{ dto: GetRegistrosByDateRangeDto; errors: string[] }> {
  const dto = plainToInstance(GetRegistrosByDateRangeDto, input);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return {
    dto,
    errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
  };
}

function user(
  partial: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'rol'>,
): AuthenticatedUser {
  return {
    userId: partial.userId === undefined ? 1 : partial.userId,
    email: partial.email ?? 'test@example.com',
    idGrupo: partial.idGrupo !== undefined ? partial.idGrupo : 7,
    rol: partial.rol,
  };
}

const baseRegistro = {
  id: 25,
  registro: 'REG-00025',
  latitud: 18.9,
  longitud: -99.2,
  entidadFederativa: 'Morelos',
  municipio: 'Cuernavaca',
  localidad: 'Cuernavaca',
  colonia: 'Centro',
  calle: 'Morelos',
  noInterior: null,
  noExterior: '100',
  cp: '62000',
  tipoRegistro: 1,
  predioObra: 0,
  estatus: 4,
  fechaCreacion: new Date('2026-07-16T14:20:00.000Z'),
  fechaActualizacion: new Date('2026-07-16T14:20:00.000Z'),
} as Registros;

function createQueryBuilderMock(options?: {
  registros?: Registros[];
  total?: number;
  licencias?: unknown[];
}) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest
      .fn()
      .mockResolvedValue([options?.registros ?? [], options?.total ?? 0]),
    getMany: jest.fn().mockResolvedValue(options?.registros ?? []),
  };

  const licenciasQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(options?.licencias ?? []),
  };

  const createQueryBuilder = jest.fn().mockReturnValue(qb);
  const createLicenciasQueryBuilder = jest.fn().mockReturnValue(licenciasQb);
  const getRepository = jest.fn().mockImplementation((entity) => {
    if (entity === Licencias) {
      return { createQueryBuilder: createLicenciasQueryBuilder };
    }
    return { createQueryBuilder };
  });
  const service = new RegistrosService(
    { getRepository } as unknown as DataSource,
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    qb,
    licenciasQb,
    createQueryBuilder,
    createLicenciasQueryBuilder,
    getRepository,
    service,
  };
}

describe('GetRegistrosQueryDto', () => {
  it('usa page=1 y limit=10 por defecto', async () => {
    const { dto, errors } = await validateQuery({});
    expect(errors).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('acepta limit=100', async () => {
    const { dto, errors } = await validateQuery({ limit: '100' });
    expect(errors).toEqual([]);
    expect(dto.limit).toBe(100);
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ limit: '101' }, 'limit'],
  ])('rechaza %j', async (input, field) => {
    const { errors } = await validateQuery(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((m) => m.toLowerCase().includes(field))).toBe(true);
  });
});

describe('registro-date-range helpers', () => {
  it('construye inicio inclusivo a las 00:00:00', () => {
    expect(buildStartDateLocal('2026-07-01')).toBe('2026-07-01 00:00:00');
  });

  it('construye límite superior exclusivo del día siguiente', () => {
    expect(buildEndExclusiveDateLocal('2026-07-16')).toBe(
      '2026-07-17 00:00:00',
    );
  });

  it('avanza de mes correctamente', () => {
    expect(buildEndExclusiveDateLocal('2026-07-31')).toBe(
      '2026-08-01 00:00:00',
    );
  });

  it('no usa interpretación UTC de YYYY-MM-DD', () => {
    // new Date('2026-07-01') sería UTC; el helper debe conservar el calendario.
    expect(buildStartDateLocal('2026-07-01')).toContain('2026-07-01');
    expect(buildEndExclusiveDateLocal('2026-07-01')).toBe(
      '2026-07-02 00:00:00',
    );
  });
});

describe('GetRegistrosByDateRangeDto', () => {
  it('acepta un rango válido YYYY-MM-DD', async () => {
    const { dto, errors } = await validateRangeDto({
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-16',
    });
    expect(errors).toEqual([]);
    expect(dto.fechaInicio).toBe('2026-07-01');
    expect(dto.fechaFin).toBe('2026-07-16');
  });

  it('acepta fechaInicio = fechaFin', async () => {
    const { errors } = await validateRangeDto({
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-01',
    });
    expect(errors).toEqual([]);
  });

  it.each([
    [{ fechaInicio: '', fechaFin: '2026-07-16' }],
    [{ fechaInicio: '2026-07-01', fechaFin: '' }],
    [{ fechaInicio: '16/07/2026', fechaFin: '2026-07-16' }],
    [{ fechaInicio: '2026/07/16', fechaFin: '2026-07-16' }],
    [{ fechaInicio: '2026-07-01T00:00:00.000Z', fechaFin: '2026-07-16' }],
    [{ fechaInicio: 'texto', fechaFin: '2026-07-16' }],
  ])('rechaza fechas inválidas %j', async (input) => {
    const { errors } = await validateRangeDto(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza idRol/idGrupo/idUsuario en el body (forbidNonWhitelisted)', async () => {
    const { errors } = await validateRangeDto({
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-16',
      idRol: 4,
      idGrupo: 10,
      idUsuario: 20,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RegistrosService.findAllPaginated — visibilidad por rol', () => {
  it('rol 4 obtiene todos sin join a CapturistaVisita', async () => {
    const { qb, getRepository, service } = createQueryBuilderMock();
    await service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 4 }));

    expect(getRepository).toHaveBeenCalledWith(Registros);
    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('registro.fechaCreacion', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('registro.id', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.getManyAndCount).toHaveBeenCalled();
  });

  it('rol 3 sin join; rol 2 filtra por grupo; rol 1 por capturista', async () => {
    const a = createQueryBuilderMock();
    await a.service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 3 }));
    expect(a.qb.innerJoin).not.toHaveBeenCalled();

    const b = createQueryBuilderMock();
    await b.service.findAllPaginated(
      { page: 1, limit: 10 },
      user({ rol: 2, idGrupo: 7 }),
    );
    expect(b.qb.innerJoin).toHaveBeenCalledWith(
      CapturistaVisita,
      'capturistaVisita',
      'capturistaVisita.idRegistro = registro.id',
    );
    expect(b.qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idGrupo = :idGrupo',
      { idGrupo: 7 },
    );
    expect(b.qb.distinct).toHaveBeenCalledWith(true);

    const c = createQueryBuilderMock();
    await c.service.findAllPaginated(
      { page: 1, limit: 10 },
      user({ rol: 1, userId: 30 }),
    );
    expect(c.qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idCapturista = :idUsuario',
      { idUsuario: 30 },
    );
  });

  it('rol 2 sin grupo y rol desconocido reciben 403', async () => {
    const a = createQueryBuilderMock();
    await expect(
      a.service.findAllPaginated(
        { page: 1, limit: 10 },
        user({ rol: 2, idGrupo: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const b = createQueryBuilderMock();
    await expect(
      b.service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 8 })),
    ).rejects.toThrow('No tienes permisos para consultar los registros.');
  });

  it('incluye Licencias planas en data y conserva paginated', async () => {
    const licencia = {
      id: 3,
      idRegistro: 25,
      registro: '02062026',
      nombreComercial: 'BBVA',
      giro: 'BANCO',
      licenciaSuelo: '02062026',
      nombrePropietario: 'Raul',
      apellidoPaternoPropietario: 'Torres',
      apellidoMaternoPropietario: 'Tzec',
      tipoPersona: 1,
      rfc: 'TOC012026',
      fechaExpedicion: new Date('2026-07-17T00:32:08.000Z'),
      fechaRefrendo: new Date('2026-07-17T00:32:08.000Z'),
      estacionamiento: 1,
      tipo: 2,
      fechaHora: new Date('2026-07-17T00:32:08.000Z'),
      fechaCreacion: new Date('2026-07-17T00:32:53.000Z'),
      fechaActualizacion: new Date('2026-07-17T00:32:53.000Z'),
    };

    const { licenciasQb, getRepository, service } = createQueryBuilderMock({
      registros: [baseRegistro],
      total: 1,
      licencias: [licencia],
    });

    const result = await service.findAllPaginated(
      { page: 1, limit: 10 },
      user({ rol: 4 }),
    );

    expect(getRepository).toHaveBeenCalledWith(Licencias);
    expect(licenciasQb.where).toHaveBeenCalledWith(
      'licencias.idRegistro IN (:...idsRegistro)',
      { idsRegistro: [25] },
    );
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('paginated');
    expect(result.paginated).toEqual({ total: 1, page: 1, lastPage: 1 });
    expect(result.data[0]).not.toHaveProperty('Licencias');
    expect(result.data[0]).not.toHaveProperty('licencias');
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 25,
        registro: 'REG-00025',
        idLicencia: 3,
        idRegistroLicencia: 25,
        registroLicencia: '02062026',
        nombreComercial: 'BBVA',
        giro: 'BANCO',
        tipoLicencia: 2,
        fechaCreacionLicencia: licencia.fechaCreacion,
      }),
    );
  });

  it('sin Licencias rellena atributos null y no altera el total', async () => {
    const { createLicenciasQueryBuilder, service } = createQueryBuilderMock({
      registros: [baseRegistro],
      total: 5,
      licencias: [],
    });

    const result = await service.findAllPaginated(
      { page: 1, limit: 10 },
      user({ rol: 4 }),
    );

    expect(createLicenciasQueryBuilder).toHaveBeenCalled();
    expect(result.paginated?.total).toBe(5);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 25,
        idLicencia: null,
        nombreComercial: null,
        tipoLicencia: null,
        fechaCreacionLicencia: null,
      }),
    );
  });

  it('no consulta Licencias si la página está vacía', async () => {
    const { createLicenciasQueryBuilder, service } = createQueryBuilderMock();
    await service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 4 }));
    expect(createLicenciasQueryBuilder).not.toHaveBeenCalled();
  });
});

describe('RegistrosService.findByDateRange', () => {
  it('aplica rango semiabierto y orden estable', async () => {
    const { qb, service } = createQueryBuilderMock();

    await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
      user({ rol: 4 }),
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      'registro.fechaCreacion >= :startDate',
      { startDate: '2026-07-01 00:00:00' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'registro.fechaCreacion < :endExclusive',
      { endExclusive: '2026-07-17 00:00:00' },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('registro.fechaCreacion', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('registro.id', 'DESC');
    expect(qb.getMany).toHaveBeenCalled();
    expect(qb.getManyAndCount).not.toHaveBeenCalled();
    expect(qb.skip).not.toHaveBeenCalled();
    expect(qb.innerJoin).not.toHaveBeenCalled();
  });

  it('incluye un solo día completo cuando fechaInicio = fechaFin', async () => {
    const { qb, service } = createQueryBuilderMock();

    await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-01' },
      user({ rol: 3 }),
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      'registro.fechaCreacion >= :startDate',
      { startDate: '2026-07-01 00:00:00' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'registro.fechaCreacion < :endExclusive',
      { endExclusive: '2026-07-02 00:00:00' },
    );
  });

  it('rechaza fechaInicio > fechaFin', async () => {
    const { qb, service } = createQueryBuilderMock();

    await expect(
      service.findByDateRange(
        { fechaInicio: '2026-07-20', fechaFin: '2026-07-01' },
        user({ rol: 4 }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(qb.getMany).not.toHaveBeenCalled();
  });

  it('rol 2 filtra por grupo dentro del rango', async () => {
    const { qb, service } = createQueryBuilderMock();

    await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
      user({ rol: 2, idGrupo: 7 }),
    );

    expect(qb.innerJoin).toHaveBeenCalledWith(
      CapturistaVisita,
      'capturistaVisita',
      'capturistaVisita.idRegistro = registro.id',
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idGrupo = :idGrupo',
      { idGrupo: 7 },
    );
    expect(qb.distinct).toHaveBeenCalledWith(true);
  });

  it('rol 2 sin grupo recibe 403', async () => {
    const { service } = createQueryBuilderMock();
    await expect(
      service.findByDateRange(
        { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
        user({ rol: 2, idGrupo: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rol 1 filtra por capturista y no por grupo', async () => {
    const { qb, service } = createQueryBuilderMock();

    await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
      user({ rol: 1, userId: 30, idGrupo: 7 }),
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idCapturista = :idUsuario',
      { idUsuario: 30 },
    );
    expect(
      qb.andWhere.mock.calls.some((c) => String(c[0]).includes('idGrupo')),
    ).toBe(false);
  });

  it('rol 1 sin usuario y rol desconocido reciben 403', async () => {
    const a = createQueryBuilderMock();
    await expect(
      a.service.findByDateRange(
        { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
        user({ rol: 1, userId: null as unknown as number }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const b = createQueryBuilderMock();
    await expect(
      b.service.findByDateRange(
        { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
        user({ rol: 8 }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve arreglo vacío sin data wrapper', async () => {
    const { service } = createQueryBuilderMock();

    const result = await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
      user({ rol: 4 }),
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
    expect(result).not.toHaveProperty('data');
  });

  it('fusiona Licencias en camelCase sin anidar', async () => {
    const { service } = createQueryBuilderMock({
      registros: [baseRegistro],
      licencias: [
        {
          id: 3,
          idRegistro: 25,
          registro: 'LIC-25',
          nombreComercial: 'BBVA',
          giro: 'BANCO',
          licenciaSuelo: null,
          nombrePropietario: null,
          apellidoPaternoPropietario: null,
          apellidoMaternoPropietario: null,
          tipoPersona: 1,
          rfc: null,
          fechaExpedicion: null,
          fechaRefrendo: null,
          estacionamiento: null,
          tipo: 2,
          fechaHora: null,
          fechaCreacion: new Date('2026-07-16T14:20:00.000Z'),
          fechaActualizacion: new Date('2026-07-16T14:20:00.000Z'),
        },
      ],
    });

    const result = await service.findByDateRange(
      { fechaInicio: '2026-07-01', fechaFin: '2026-07-16' },
      user({ rol: 4 }),
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('Licencias');
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 25,
        municipio: 'Cuernavaca',
        estatus: 4,
        idLicencia: 3,
        registroLicencia: 'LIC-25',
        nombreComercial: 'BBVA',
        tipoLicencia: 2,
      }),
    );
    expect(result[0]).not.toHaveProperty('idCapturista');
    expect(result[0]).not.toHaveProperty('idGrupo');
  });
});
