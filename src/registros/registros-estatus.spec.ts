import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Registros } from 'src/entities/Registros';
import { UpdateRegistroEstatusDto } from './dto/update-registro-estatus.dto';
import { RegistrosService } from './registros.service';

function user(
  partial: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    userId: partial.userId === undefined ? 8 : partial.userId,
    email: partial.email ?? 'test@example.com',
    idGrupo: partial.idGrupo === undefined ? 7 : partial.idGrupo,
    rol: partial.rol === undefined ? 4 : partial.rol,
  };
}

async function validateDto(input: Record<string, unknown>) {
  const dto = plainToInstance(UpdateRegistroEstatusDto, input);
  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

function createService(options?: {
  registro?: Registros | null;
  visita?: CapturistaVisita | null;
  visitaGrupo?: CapturistaVisita | null;
  updateError?: Error;
}) {
  const registro =
    options?.registro === undefined
      ? ({ id: 4, estatus: 4 } as Registros)
      : options.registro;
  const visita =
    options?.visita === undefined
      ? ({
          id: 12,
          idRegistro: 4,
          idCapturista: 15,
          idSupervisor: null,
          idGrupo: 7,
          fechaHora: new Date(),
        } as CapturistaVisita)
      : options.visita;

  const manager = {
    findOne: jest.fn().mockImplementation((entity, query) => {
      if (entity === Registros) {
        return Promise.resolve(registro);
      }
      if (query?.where?.idGrupo !== undefined) {
        return Promise.resolve(
          options?.visitaGrupo === undefined ? visita : options.visitaGrupo,
        );
      }
      return Promise.resolve(visita);
    }),
    update: jest.fn().mockImplementation(() => {
      if (options?.updateError) {
        return Promise.reject(options.updateError);
      }
      return Promise.resolve({ affected: 1 });
    }),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 20 }] }),
  };

  const queryRunner = {
    manager,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const dataSource = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
  } as unknown as DataSource;

  const service = new RegistrosService(
    dataSource,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, manager, queryRunner };
}

describe('UpdateRegistroEstatusDto', () => {
  it.each([1, 2, 3, 4, 5])('acepta estatus %i', async (estatus) => {
    expect(await validateDto({ estatus })).toHaveLength(0);
  });

  it.each([0, 6, -1, 1.5, null, 'Datos Correctos', '3'])(
    'rechaza estatus %p',
    async (estatus) => {
      expect((await validateDto({ estatus })).length).toBeGreaterThan(0);
    },
  );

  it('rechaza propiedades adicionales e IdSupervisor', async () => {
    expect(
      (await validateDto({ estatus: 3, nombre: 'Otro' })).length,
    ).toBeGreaterThan(0);
    expect(
      (await validateDto({ estatus: 3, IdSupervisor: 99 })).length,
    ).toBeGreaterThan(0);
  });
});

describe('RegistrosService.updateEstatus', () => {
  it.each([
    [1, 'Información Faltante'],
    [2, 'Rechazo o Sin respuesta'],
    [3, 'Datos Correctos'],
    [4, 'Revisión'],
    [5, 'Baja'],
  ])(
    'actualiza únicamente Estatus=%i y devuelve descripción',
    async (estatus, descripcionEstatus) => {
      const { service, manager, queryRunner } = createService();

      const result = await service.updateEstatus(
        4,
        { estatus },
        user({ rol: 4, userId: 8 }),
      );

      expect(manager.update).toHaveBeenNthCalledWith(
        1,
        Registros,
        { id: 4 },
        { estatus },
      );
      expect(manager.update).toHaveBeenNthCalledWith(
        2,
        CapturistaVisita,
        { id: 12 },
        expect.objectContaining({
          idSupervisor: 8,
          fechaHora: expect.any(Date),
        }),
      );
      expect(manager.update.mock.calls[1][2]).not.toHaveProperty(
        'idCapturista',
      );
      expect(manager.update.mock.calls[1][2]).not.toHaveProperty('idGrupo');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Estatus actualizado correctamente.',
        data: {
          idRegistro: 4,
          estatus,
          descripcionEstatus,
          idSupervisor: 8,
        },
      });
    },
  );

  it('crea CapturistaVisita si no existe, sin inventar capturista', async () => {
    const { service, manager } = createService({ visita: null });

    await service.updateEstatus(
      4,
      { estatus: 3 },
      user({ rol: 4, userId: 8 }),
    );

    expect(manager.insert).toHaveBeenCalledWith(
      CapturistaVisita,
      expect.objectContaining({
        idRegistro: 4,
        idCapturista: null,
        idSupervisor: 8,
        idGrupo: null,
        fechaHora: expect.any(Date),
      }),
    );
  });

  it('devuelve 404 y revierte si no existe Registros', async () => {
    const { service, manager, queryRunner } = createService({
      registro: null,
    });

    await expect(
      service.updateEstatus(4, { estatus: 3 }, user({ rol: 4 })),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(manager.update).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('rol 2 solo actualiza registros de su grupo', async () => {
    const allowed = createService();
    await allowed.service.updateEstatus(
      4,
      { estatus: 3 },
      user({ rol: 2, idGrupo: 7 }),
    );
    expect(allowed.manager.findOne).toHaveBeenCalledWith(
      CapturistaVisita,
      expect.objectContaining({
        where: { idRegistro: 4, idGrupo: 7 },
      }),
    );

    const denied = createService({ visitaGrupo: null });
    await expect(
      denied.service.updateEstatus(
        4,
        { estatus: 3 },
        user({ rol: 2, idGrupo: 99 }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(denied.manager.update).not.toHaveBeenCalled();
    expect(denied.queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('rechaza rol 1 y usuario no identificable antes de transacción', async () => {
    const roleDenied = createService();
    await expect(
      roleDenied.service.updateEstatus(
        4,
        { estatus: 3 },
        user({ rol: 1 }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roleDenied.queryRunner.connect).not.toHaveBeenCalled();

    const noUser = createService();
    await expect(
      noUser.service.updateEstatus(
        4,
        { estatus: 3 },
        user({ userId: null as unknown as number }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(noUser.queryRunner.connect).not.toHaveBeenCalled();
  });

  it('revierte y libera si falla una actualización', async () => {
    const { service, queryRunner } = createService({
      updateError: new Error('database error'),
    });

    await expect(
      service.updateEstatus(4, { estatus: 3 }, user({ rol: 4 })),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
