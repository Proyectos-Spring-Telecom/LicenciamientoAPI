import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { MonitoreoService } from 'src/monitoreo/monitoreo.service';
import { RegistrosService } from './registros.service';

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

function createService(monitoreoFindOne: jest.Mock) {
  const monitoreoService = {
    findOne: monitoreoFindOne,
  } as unknown as MonitoreoService;

  const service = new RegistrosService(
    {} as DataSource,
    {} as never,
    {} as never,
    {} as never,
    monitoreoService,
  );

  return { service, monitoreoService };
}

describe('RegistrosService.findOne — detalle por idRegistro', () => {
  it('delega en MonitoreoService y conserva el contrato { data }', async () => {
    const detalle = {
      data: {
        id: 25,
        registro: 'REG-00025',
        predioObra: 0,
        estatus: 4,
        idCapturistaVisita: 12,
        idRegistroCapturistaVisita: 25,
        idGrupoCapturistaVisita: 2,
        fechaHoraCapturistaVisita: new Date('2026-07-17T10:00:00.000Z'),
        idCapturista: 15,
        nombreCapturista: 'Juan',
        apellidoPaternoCapturista: 'Pérez',
        apellidoMaternoCapturista: 'López',
        nombreCompletoCapturista: 'Juan Pérez López',
        idGrupoCapturista: 2,
        nombreGrupoCapturista: 'Grupo Norte',
        idSupervisor: 8,
        nombreSupervisor: 'María',
        apellidoPaternoSupervisor: 'Torres',
        apellidoMaternoSupervisor: 'García',
        nombreCompletoSupervisor: 'María Torres García',
        idGrupoSupervisor: 3,
        nombreGrupoSupervisor: 'Supervisores Centro',
        fotos: [
          {
            id: 21,
            idRegistro: 25,
            ruta: '/registros/data/foto-1.jpg',
            fechaHora: new Date('2026-07-17T10:30:00.000Z'),
            idTipoFoto: 6,
          },
        ],
        Sapac: null,
        Catastro: null,
        Licencias: { Id: 12, NombreComercial: 'Comercio de ejemplo' },
        ProteccionCivil: null,
      },
    };

    const findOne = jest.fn().mockResolvedValue(detalle);
    const { service, monitoreoService } = createService(findOne);

    const result = await service.findOne(25, user({ rol: 4 }));

    expect(monitoreoService.findOne).toHaveBeenCalledWith(25, user({ rol: 4 }));
    expect(result).toEqual(detalle);
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('idCapturista', 15);
    expect(result.data).toHaveProperty(
      'nombreCompletoCapturista',
      'Juan Pérez López',
    );
    expect(result.data).toHaveProperty('idGrupoCapturista', 2);
    expect(result.data).toHaveProperty('nombreGrupoCapturista', 'Grupo Norte');
    expect(result.data).toHaveProperty('idSupervisor', 8);
    expect(result.data).toHaveProperty(
      'nombreCompletoSupervisor',
      'María Torres García',
    );
    expect(result.data).toHaveProperty('idGrupoSupervisor', 3);
    expect(result.data).toHaveProperty('fotos');
    expect(Array.isArray(result.data.fotos)).toBe(true);
    expect(result.data).not.toHaveProperty('capturista');
    expect(result.data).not.toHaveProperty('supervisor');
    expect(result.data).not.toHaveProperty('CapturistaVisita');
    expect(result.data).not.toHaveProperty('IdCapturista');
    expect(result.data).not.toHaveProperty('Fotos');
  });

  it('propaga BadRequest sin alterar', async () => {
    const findOne = jest
      .fn()
      .mockRejectedValue(
        new BadRequestException('El identificador del registro no es válido.'),
      );
    const { service } = createService(findOne);

    await expect(service.findOne(0, user({ rol: 4 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('traduce 404 de Monitoreo al mensaje de Registros', async () => {
    const findOne = jest
      .fn()
      .mockRejectedValue(
        new NotFoundException('El registro solicitado no existe.'),
      );
    const { service } = createService(findOne);

    await expect(service.findOne(999, user({ rol: 4 }))).rejects.toEqual(
      new NotFoundException('No se encontró el registro solicitado.'),
    );
  });

  it('traduce 403 de alcance de Monitoreo a mensaje de Registros', async () => {
    const findOne = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException(
          'No tienes permisos para consultar el monitoreo.',
        ),
      );
    const { service } = createService(findOne);

    await expect(
      service.findOne(25, user({ rol: 2, idGrupo: 99 })),
    ).rejects.toEqual(
      new ForbiddenException(
        'No tienes permisos para consultar los registros.',
      ),
    );
  });

  it('conserva 403 de supervisor sin grupo', async () => {
    const findOne = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException(
          'El usuario supervisor no tiene un grupo asignado.',
        ),
      );
    const { service } = createService(findOne);

    await expect(
      service.findOne(25, user({ rol: 2, idGrupo: null })),
    ).rejects.toEqual(
      new ForbiddenException(
        'El usuario supervisor no tiene un grupo asignado.',
      ),
    );
  });

  it('sin fotos el contrato mantiene arreglo vacío', async () => {
    const findOne = jest.fn().mockResolvedValue({
      data: {
        id: 25,
        idCapturista: null,
        nombreCompletoCapturista: null,
        idGrupoCapturista: null,
        nombreGrupoCapturista: null,
        idSupervisor: null,
        nombreCompletoSupervisor: null,
        idGrupoSupervisor: null,
        nombreGrupoSupervisor: null,
        fotos: [],
      },
    });
    const { service } = createService(findOne);

    const result = await service.findOne(25, user({ rol: 3 }));
    expect(result.data.fotos).toEqual([]);
    expect(result.data.fotos).not.toBeNull();
  });

  it('claves del data sin aliases duplicados en nivel superior plano', async () => {
    const findOne = jest.fn().mockResolvedValue({
      data: {
        id: 25,
        idCapturista: 15,
        nombreCapturista: 'Juan',
        apellidoPaternoCapturista: 'Pérez',
        apellidoMaternoCapturista: 'López',
        nombreCompletoCapturista: 'Juan Pérez López',
        idGrupoCapturista: 2,
        nombreGrupoCapturista: 'Grupo Norte',
        idSupervisor: 8,
        nombreSupervisor: 'María',
        apellidoPaternoSupervisor: 'Torres',
        apellidoMaternoSupervisor: 'García',
        nombreCompletoSupervisor: 'María Torres García',
        idGrupoSupervisor: 3,
        nombreGrupoSupervisor: 'Supervisores Centro',
        idCapturistaVisita: 1,
        idRegistroCapturistaVisita: 25,
        idGrupoCapturistaVisita: 2,
        fechaHoraCapturistaVisita: null,
        fotos: [
          {
            id: 21,
            idRegistro: 25,
            ruta: '/a.jpg',
            fechaHora: null,
            idTipoFoto: 6,
          },
        ],
      },
    });
    const { service } = createService(findOne);
    const result = await service.findOne(25, user({ rol: 4 }));
    const data = result.data as Record<string, unknown>;
    const keys = Object.keys(data);
    expect(new Set(keys).size).toBe(keys.length);

    for (const forbidden of [
      'Id',
      'IdCapturista',
      'IdSupervisor',
      'IdGrupo',
      'Fotos',
      'capturista',
      'supervisor',
      'CapturistaVisita',
      'idGrupo',
    ]) {
      expect(data).not.toHaveProperty(forbidden);
    }

    const fotos = data.fotos as Array<{ id: number; idTipoFoto: number }>;
    expect(fotos.every((f) => [6, 7, 8].includes(f.idTipoFoto))).toBe(true);
    expect(new Set(fotos.map((f) => f.id)).size).toBe(fotos.length);
  });
});
