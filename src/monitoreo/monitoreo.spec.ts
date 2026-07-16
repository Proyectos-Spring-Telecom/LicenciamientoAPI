import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Registros } from 'src/entities/Registros';
import { GetMonitoreoQueryDto } from './dto/get-monitoreo-query.dto';
import { MonitoreoService } from './monitoreo.service';

async function validateQuery(
  input: Record<string, unknown>,
): Promise<{ dto: GetMonitoreoQueryDto; errors: string[] }> {
  const dto = plainToInstance(GetMonitoreoQueryDto, input);
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

function createService() {
  const qb = {
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
  const createQueryBuilder = jest.fn().mockReturnValue(qb);
  const repo = { createQueryBuilder } as unknown as Repository<Registros>;
  const service = new MonitoreoService(repo);
  return { qb, createQueryBuilder, service };
}

describe('GetMonitoreoQueryDto', () => {
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
    [{ page: '-1' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ page: 'texto' }, 'page'],
    [{ limit: '0' }, 'limit'],
    [{ limit: '-1' }, 'limit'],
    [{ limit: '1.5' }, 'limit'],
    [{ limit: 'texto' }, 'limit'],
    [{ limit: '101' }, 'limit'],
    [{ limit: '10abc' }, 'limit'],
  ])('rechaza %j', async (input, field) => {
    const { errors } = await validateQuery(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((m) => m.toLowerCase().includes(field))).toBe(true);
  });

  it('rechaza idRol/idGrupo/idUsuario en query', async () => {
    const { errors } = await validateQuery({
      page: '1',
      limit: '10',
      idRol: 4,
      idGrupo: 1,
      idUsuario: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('MonitoreoService.findAll', () => {
  it('rol 4 obtiene todos sin join', async () => {
    const { qb, createQueryBuilder, service } = createService();

    await service.findAll({ page: 1, limit: 10 }, user({ rol: 4 }));

    expect(createQueryBuilder).toHaveBeenCalledWith('registro');
    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('registro.fechaCreacion', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('registro.id', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.getManyAndCount).toHaveBeenCalled();
  });

  it('rol 3 obtiene todos sin join', async () => {
    const { qb, service } = createService();
    await service.findAll({ page: 1, limit: 10 }, user({ rol: 3 }));
    expect(qb.innerJoin).not.toHaveBeenCalled();
  });

  it('rol 2 filtra por IdGrupo con distinct', async () => {
    const { qb, service } = createService();

    await service.findAll(
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
  });

  it('rol 2 sin grupo recibe 403', async () => {
    const { qb, service } = createService();

    await expect(
      service.findAll({ page: 1, limit: 10 }, user({ rol: 2, idGrupo: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(qb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('rol 1 filtra por IdCapturista y no por grupo', async () => {
    const { qb, service } = createService();

    await service.findAll(
      { page: 1, limit: 10 },
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

  it('rol 1 sin usuario recibe 403', async () => {
    const { service } = createService();
    await expect(
      service.findAll(
        { page: 1, limit: 10 },
        user({ rol: 1, userId: null as unknown as number }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rol desconocido recibe 403 con mensaje de monitoreo', async () => {
    const { qb, service } = createService();

    await expect(
      service.findAll({ page: 1, limit: 10 }, user({ rol: 8 })),
    ).rejects.toThrow('No tienes permisos para consultar el monitoreo.');

    expect(qb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('aplica filtro antes de paginar y calcula lastPage', async () => {
    const { qb, service } = createService();
    qb.getManyAndCount.mockResolvedValue([
      [
        {
          id: 150,
          registro: 'REG-00150',
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
          estatus: 1,
          fechaCreacion: new Date('2026-07-16T14:30:00.000Z'),
          fechaActualizacion: new Date('2026-07-16T14:30:00.000Z'),
        },
      ],
      30,
    ]);

    const result = await service.findAll(
      { page: 2, limit: 10 },
      user({ rol: 2, idGrupo: 7 }),
    );

    const joinOrder = qb.innerJoin.mock.invocationCallOrder[0];
    const skipOrder = qb.skip.mock.invocationCallOrder[0];
    expect(joinOrder).toBeLessThan(skipOrder);
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(result.paginated).toEqual({
      total: 30,
      page: 2,
      lastPage: 3,
    });
    expect(result.data[0]).toEqual(
      expect.objectContaining({ id: 150, municipio: 'Cuernavaca' }),
    );
    expect(result.data[0]).not.toHaveProperty('idCapturista');
    expect(result.data[0]).not.toHaveProperty('idGrupo');
    expect(result.data[0]).not.toHaveProperty('capturistaVisitas');
  });

  it('lista vacía con 200 lógico (data vacía y total 0)', async () => {
    const { service } = createService();
    const result = await service.findAll(
      { page: 1, limit: 10 },
      user({ rol: 4 }),
    );

    expect(result).toEqual({
      data: [],
      paginated: { total: 0, page: 1, lastPage: 0 },
    });
  });
});
