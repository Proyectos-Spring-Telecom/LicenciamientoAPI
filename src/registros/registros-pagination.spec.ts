import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Registros } from 'src/entities/Registros';
import { GetRegistrosQueryDto } from './dto/get-registros-query.dto';
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
    [{ limit: '10abc' }, 'limit'],
  ])('rechaza %j', async (input, field) => {
    const { errors } = await validateQuery(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((m) => m.toLowerCase().includes(field))).toBe(true);
  });

  it('no declara idRol/idGrupo/idUsuario (no afectan la consulta)', () => {
    const dto = new GetRegistrosQueryDto();
    expect(dto).not.toHaveProperty('idRol');
    expect(dto).not.toHaveProperty('idGrupo');
    expect(dto).not.toHaveProperty('idUsuario');
  });
});

describe('RegistrosService.findAllPaginated — visibilidad por rol', () => {
  let qb: {
    select: jest.Mock;
    innerJoin: jest.Mock;
    andWhere: jest.Mock;
    distinct: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let createQueryBuilder: jest.Mock;
  let getRepository: jest.Mock;
  let service: RegistrosService;

  beforeEach(() => {
    qb = {
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    createQueryBuilder = jest.fn().mockReturnValue(qb);
    getRepository = jest.fn().mockReturnValue({ createQueryBuilder });
    service = new RegistrosService(
      { getRepository } as unknown as DataSource,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('rol 4 obtiene todos sin join a CapturistaVisita', async () => {
    await service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 4 }));

    expect(getRepository).toHaveBeenCalledWith(Registros);
    expect(createQueryBuilder).toHaveBeenCalledWith('registro');
    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.distinct).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('registro.fechaCreacion', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('registro.id', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.getManyAndCount).toHaveBeenCalled();
  });

  it('rol 3 obtiene todos sin join a CapturistaVisita', async () => {
    await service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 3 }));

    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('rol 2 filtra por IdGrupo con distinct', async () => {
    await service.findAllPaginated(
      { page: 1, limit: 10 },
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
    expect(qb.andWhere.mock.calls.some((c) => String(c[0]).includes('idCapturista'))).toBe(
      false,
    );
  });

  it('rol 2 sin IdGrupo recibe 403', async () => {
    await expect(
      service.findAllPaginated(
        { page: 1, limit: 10 },
        user({ rol: 2, idGrupo: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(qb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('rol 1 filtra por IdCapturista y no solo por IdGrupo', async () => {
    await service.findAllPaginated(
      { page: 1, limit: 10 },
      user({ rol: 1, userId: 30, idGrupo: 7 }),
    );

    expect(qb.innerJoin).toHaveBeenCalledWith(
      CapturistaVisita,
      'capturistaVisita',
      'capturistaVisita.idRegistro = registro.id',
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idCapturista = :idUsuario',
      { idUsuario: 30 },
    );
    expect(qb.distinct).toHaveBeenCalledWith(true);
    expect(
      qb.andWhere.mock.calls.some((c) => String(c[0]).includes('idGrupo')),
    ).toBe(false);
  });

  it('rol 1 sin IdUsuario recibe 403', async () => {
    await expect(
      service.findAllPaginated(
        { page: 1, limit: 10 },
        user({ rol: 1, userId: null as unknown as number }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(qb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('rol desconocido recibe 403', async () => {
    await expect(
      service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 8 })),
    ).rejects.toThrow('No tienes permisos para consultar los registros.');

    expect(qb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('rol null recibe 403 (denegar por defecto)', async () => {
    await expect(
      service.findAllPaginated(
        { page: 1, limit: 10 },
        user({ rol: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aplica filtro antes de paginación y calcula lastPage', async () => {
    qb.getManyAndCount.mockResolvedValue([
      [
        {
          id: 25,
          registro: null,
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
          fechaCreacion: new Date('2026-07-16T11:14:42.000Z'),
          fechaActualizacion: new Date('2026-07-16T11:14:42.000Z'),
        },
      ],
      35,
    ]);

    const result = await service.findAllPaginated(
      { page: 2, limit: 10 },
      user({ rol: 2, idGrupo: 7 }),
    );

    const joinOrder = qb.innerJoin.mock.invocationCallOrder[0];
    const skipOrder = qb.skip.mock.invocationCallOrder[0];
    expect(joinOrder).toBeLessThan(skipOrder);
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result.paginated).toEqual({
      total: 35,
      page: 2,
      lastPage: 4,
    });
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 25,
        municipio: 'Cuernavaca',
        estatus: 4,
      }),
    );
    expect(result.data[0]).not.toHaveProperty('idCapturista');
    expect(result.data[0]).not.toHaveProperty('idGrupo');
    expect(result.data[0]).not.toHaveProperty('capturistaVisitas');
  });

  it('página fuera de rango devuelve data vacía con metadata real', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 15]);

    const result = await service.findAllPaginated(
      { page: 50, limit: 10 },
      user({ rol: 4 }),
    );

    expect(qb.skip).toHaveBeenCalledWith(490);
    expect(result.data).toEqual([]);
    expect(result.paginated).toEqual({
      total: 15,
      page: 50,
      lastPage: 2,
    });
  });

  it('select solo incluye columnas de Registros', async () => {
    await service.findAllPaginated({ page: 1, limit: 10 }, user({ rol: 4 }));

    const selected: string[] = qb.select.mock.calls[0][0];
    expect(selected.every((col) => col.startsWith('registro.'))).toBe(true);
    expect(selected.some((col) => col.includes('capturista'))).toBe(false);
  });
});
