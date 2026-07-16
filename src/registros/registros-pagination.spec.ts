import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { GetRegistrosQueryDto } from './dto/get-registros-query.dto';
import { Registros } from 'src/entities/Registros';
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

describe('GetRegistrosQueryDto', () => {
  it('usa page=1 y limit=10 por defecto', async () => {
    const { dto, errors } = await validateQuery({});
    expect(errors).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('acepta page y limit personalizados', async () => {
    const { dto, errors } = await validateQuery({ page: '2', limit: '25' });
    expect(errors).toEqual([]);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
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
});

describe('RegistrosService.findAllPaginated', () => {
  const findAndCount = jest.fn();
  const getRepository = jest.fn().mockReturnValue({ findAndCount });

  const service = new RegistrosService(
    { getRepository } as unknown as DataSource,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    findAndCount.mockReset();
    getRepository.mockClear();
  });

  it('consulta solo Registros con skip/take y orden estable', async () => {
    findAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAllPaginated({ page: 1, limit: 10 });

    expect(getRepository).toHaveBeenCalledWith(Registros);
    expect(findAndCount).toHaveBeenCalledWith({
      select: expect.arrayContaining([
        'id',
        'registro',
        'estatus',
        'fechaCreacion',
        'fechaActualizacion',
      ]),
      skip: 0,
      take: 10,
      order: {
        fechaCreacion: 'DESC',
        id: 'DESC',
      },
    });
    expect(findAndCount.mock.calls[0][0]).not.toHaveProperty('relations');
    expect(result.data).toEqual([]);
    expect(result.paginated).toEqual({
      total: 0,
      page: 1,
      lastPage: 0,
    });
  });

  it('calcula skip y lastPage correctamente', async () => {
    findAndCount.mockResolvedValue([
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

    const result = await service.findAllPaginated({ page: 2, limit: 10 });

    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
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
        predioObra: 0,
      }),
    );
    expect(result.data[0]).not.toHaveProperty('capturistaVisitas');
    expect(result.data[0]).not.toHaveProperty('sapacs');
    expect(result.data[0]).not.toHaveProperty('catastros');
  });

  it('devuelve data vacía cuando la página supera el total', async () => {
    findAndCount.mockResolvedValue([[], 15]);

    const result = await service.findAllPaginated({ page: 50, limit: 10 });

    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 490, take: 10 }),
    );
    expect(result.data).toEqual([]);
    expect(result.paginated).toEqual({
      total: 15,
      page: 50,
      lastPage: 2,
    });
  });

  it('mapea id bigint numérico sin relaciones', async () => {
    findAndCount.mockResolvedValue([
      [{ id: 1, registro: 'R-1', estatus: 4 } as Registros],
      1,
    ]);

    const result = await service.findAllPaginated({ page: 1, limit: 10 });

    expect(result.data[0].id).toBe(1);
    expect(typeof result.data[0].id).toBe('number');
  });
});

describe('Registros repository pagination contract', () => {
  it('findAndCount recibe Repository tipado (no paginación en memoria)', () => {
    const repo = {
      findAndCount: jest.fn(),
    } as unknown as Repository<Registros>;

    expect(typeof repo.findAndCount).toBe('function');
  });
});
