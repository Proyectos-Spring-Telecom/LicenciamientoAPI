import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Registros } from 'src/entities/Registros';
import { MonitoreoService } from './monitoreo.service';

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

function emptyRepo(): Repository<any> {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<any>;
}

function createListService(options?: {
  registros?: Registros[];
  licencias?: unknown[];
  visitas?: unknown[];
  usuarios?: unknown[];
}) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(options?.registros ?? []),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const registrosRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn(),
  } as unknown as Repository<Registros>;

  const licenciasQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(options?.licencias ?? []),
  };
  const licenciasRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(licenciasQb),
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as Repository<any>;

  const visitasQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(options?.visitas ?? []),
  };
  const capturistaVisitaRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(visitasQb),
    findOne: jest.fn(),
  } as unknown as Repository<any>;

  const usuariosRepository = {
    find: jest.fn().mockResolvedValue(options?.usuarios ?? []),
    findOne: jest.fn(),
  } as unknown as Repository<any>;

  const service = new MonitoreoService(
    registrosRepository,
    capturistaVisitaRepository,
    usuariosRepository,
    emptyRepo(),
    emptyRepo(),
    licenciasRepository,
    emptyRepo(),
    emptyRepo(),
    emptyRepo(),
    emptyRepo(),
    emptyRepo(),
    emptyRepo(),
    emptyRepo(),
  );

  return {
    qb,
    registrosRepository,
    licenciasRepository,
    licenciasQb,
    capturistaVisitaRepository,
    visitasQb,
    usuariosRepository,
    service,
  };
}

function createDetailService(overrides?: {
  registro?: Registros | null;
  capturistaVisita?: CapturistaVisita | null;
  visitas?: CapturistaVisita[];
  usuarios?: Array<{
    id: number;
    nombre: string | null;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
  }>;
  sapac?: unknown;
  catastro?: unknown;
  licencias?: unknown;
  contacto?: unknown;
  proteccionCivil?: unknown;
  contactoRepresentante?: unknown;
  fotos?: unknown[];
  licenciaConstruccion?: unknown;
  corresponsables?: unknown[];
  fotosLc?: unknown[];
}) {
  const registrosRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.registro ?? null),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<Registros>;

  const visitas =
    overrides?.visitas ??
    (overrides?.capturistaVisita != null ? [overrides.capturistaVisita] : []);

  const visitasQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(visitas),
  };
  const capturistaVisitaRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.capturistaVisita ?? null),
    createQueryBuilder: jest.fn().mockReturnValue(visitasQb),
  } as unknown as Repository<CapturistaVisita>;

  const usuariosRepository = {
    find: jest.fn().mockResolvedValue(overrides?.usuarios ?? []),
    findOne: jest.fn(),
  } as unknown as Repository<any>;

  const sapacRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.sapac ?? null),
  } as unknown as Repository<any>;
  const catastroRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.catastro ?? null),
  } as unknown as Repository<any>;
  const licenciasRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.licencias ?? null),
  } as unknown as Repository<any>;
  const contactosRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.contacto ?? null),
  } as unknown as Repository<any>;
  const proteccionCivilRepository = {
    findOne: jest.fn().mockResolvedValue(overrides?.proteccionCivil ?? null),
  } as unknown as Repository<any>;
  const contactoRepresentanteRepository = {
    findOne: jest
      .fn()
      .mockResolvedValue(overrides?.contactoRepresentante ?? null),
  } as unknown as Repository<any>;
  const fotosRepository = {
    find: jest.fn().mockResolvedValue(overrides?.fotos ?? []),
  } as unknown as Repository<any>;
  const licenciaConstruccionRepository = {
    findOne: jest
      .fn()
      .mockResolvedValue(overrides?.licenciaConstruccion ?? null),
  } as unknown as Repository<any>;
  const corresponsablesRepository = {
    find: jest.fn().mockResolvedValue(overrides?.corresponsables ?? []),
  } as unknown as Repository<any>;
  const fotosLicenciaConstruccionRepository = {
    find: jest.fn().mockResolvedValue(overrides?.fotosLc ?? []),
  } as unknown as Repository<any>;

  const service = new MonitoreoService(
    registrosRepository,
    capturistaVisitaRepository,
    usuariosRepository,
    sapacRepository,
    catastroRepository,
    licenciasRepository,
    contactosRepository,
    proteccionCivilRepository,
    contactoRepresentanteRepository,
    fotosRepository,
    licenciaConstruccionRepository,
    corresponsablesRepository,
    fotosLicenciaConstruccionRepository,
  );

  return {
    service,
    registrosRepository,
    capturistaVisitaRepository,
    visitasQb,
    usuariosRepository,
    sapacRepository,
    fotosRepository,
    licenciaConstruccionRepository,
    corresponsablesRepository,
    fotosLicenciaConstruccionRepository,
  };
}

const baseRegistro = {
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
  estatus: 4,
  fechaCreacion: new Date('2026-07-16T14:30:00.000Z'),
  fechaActualizacion: new Date('2026-07-16T14:30:00.000Z'),
} as Registros;

describe('MonitoreoService.findAll (arreglo plano)', () => {
  it('rol 4 obtiene todo sin join, sin skip/take y con getMany', async () => {
    const { qb, service } = createListService();

    const result = await service.findAll(user({ rol: 4 }));

    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.skip).not.toHaveBeenCalled();
    expect(qb.take).not.toHaveBeenCalled();
    expect(qb.getManyAndCount).not.toHaveBeenCalled();
    expect(qb.getMany).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('registro.fechaCreacion', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('registro.id', 'DESC');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('rol 3 obtiene todo sin join', async () => {
    const { qb, service } = createListService();
    await service.findAll(user({ rol: 3 }));
    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.getMany).toHaveBeenCalled();
  });

  it('no aplica filtro por fechas', async () => {
    const { qb, service } = createListService();
    await service.findAll(user({ rol: 4 }));

    expect(
      qb.andWhere.mock.calls.some((c) =>
        String(c[0]).toLowerCase().includes('fecha'),
      ),
    ).toBe(false);
  });

  it('rol 2 filtra por IdGrupo con distinct', async () => {
    const { qb, service } = createListService();

    await service.findAll(user({ rol: 2, idGrupo: 7 }));

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
    expect(qb.skip).not.toHaveBeenCalled();
    expect(qb.take).not.toHaveBeenCalled();
  });

  it('rol 2 sin grupo recibe 403', async () => {
    const { qb, service } = createListService();
    await expect(
      service.findAll(user({ rol: 2, idGrupo: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(qb.getMany).not.toHaveBeenCalled();
  });

  it('rol 1 filtra por IdCapturista y no por grupo', async () => {
    const { qb, service } = createListService();

    await service.findAll(user({ rol: 1, userId: 30, idGrupo: 7 }));

    expect(qb.andWhere).toHaveBeenCalledWith(
      'capturistaVisita.idCapturista = :idUsuario',
      { idUsuario: 30 },
    );
    expect(
      qb.andWhere.mock.calls.some((c) => String(c[0]).includes('idGrupo')),
    ).toBe(false);
    expect(qb.distinct).toHaveBeenCalledWith(true);
  });

  it('rol 1 sin usuario recibe 403', async () => {
    const { service } = createListService();
    await expect(
      service.findAll(user({ rol: 1, userId: null as unknown as number })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rol desconocido recibe 403', async () => {
    const { qb, service } = createListService();
    await expect(service.findAll(user({ rol: 8 }))).rejects.toThrow(
      'No tienes permisos para consultar el monitoreo.',
    );
    expect(qb.getMany).not.toHaveBeenCalled();
  });

  it('devuelve arreglo plano con licencia y capturista/supervisor fusionados', async () => {
    const fechaVisita = new Date('2026-07-16T15:00:00.000Z');
    const licencia = {
      id: 25,
      idRegistro: 150,
      registro: 'LIC-001',
      nombreComercial: 'Comercio de ejemplo',
      giro: 'Abarrotes',
      licenciaSuelo: 'LS-1',
      nombrePropietario: 'Juan',
      apellidoPaternoPropietario: 'Pérez',
      apellidoMaternoPropietario: 'López',
      tipoPersona: 1,
      rfc: 'AAA010101AAA',
      fechaExpedicion: new Date('2026-01-01T00:00:00.000Z'),
      fechaRefrendo: null,
      estacionamiento: 1,
      tipo: 2,
      fechaHora: new Date('2026-07-16T14:30:00.000Z'),
      fechaCreacion: new Date('2026-07-16T15:00:00.000Z'),
      fechaActualizacion: new Date('2026-07-16T15:00:00.000Z'),
    };

    const { licenciasQb, visitasQb, usuariosRepository, service } =
      createListService({
        registros: [baseRegistro],
        licencias: [licencia],
        visitas: [
          {
            id: 12,
            idRegistro: 150,
            idCapturista: 20,
            idSupervisor: 15,
            idGrupo: 7,
            fechaHora: fechaVisita,
          },
        ],
        usuarios: [
          {
            id: 20,
            nombre: 'Juan',
            apellidoPaterno: 'Pérez',
            apellidoMaterno: 'López',
          },
          {
            id: 15,
            nombre: 'María',
            apellidoPaterno: 'Torres',
            apellidoMaterno: 'García',
          },
        ],
      });

    const result = await service.findAll(user({ rol: 4 }));

    expect(licenciasQb.where).toHaveBeenCalledWith(
      'licencias.idRegistro IN (:...idsRegistro)',
      { idsRegistro: [150] },
    );
    expect(visitasQb.where).toHaveBeenCalledWith(
      'capturistaVisita.idRegistro IN (:...idsRegistro)',
      { idsRegistro: [150] },
    );
    expect(usuariosRepository.find).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toHaveProperty('data');
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('Licencias');
    expect(result[0]).not.toHaveProperty('CapturistaVisita');
    expect(result[0]).not.toHaveProperty('capturista');
    expect(result[0]).not.toHaveProperty('supervisor');
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 150,
        registro: 'REG-00150',
        municipio: 'Cuernavaca',
        fechaCreacion: baseRegistro.fechaCreacion,
        idLicencia: 25,
        idRegistroLicencia: 150,
        registroLicencia: 'LIC-001',
        nombreComercial: 'Comercio de ejemplo',
        giro: 'Abarrotes',
        tipoPersona: 1,
        rfc: 'AAA010101AAA',
        fechaRefrendo: null,
        tipoLicencia: 2,
        fechaHoraLicencia: licencia.fechaHora,
        fechaCreacionLicencia: licencia.fechaCreacion,
        fechaActualizacionLicencia: licencia.fechaActualizacion,
        idCapturistaVisita: 12,
        idRegistroCapturistaVisita: 150,
        idGrupoCapturistaVisita: 7,
        fechaHoraCapturistaVisita: fechaVisita,
        idCapturista: 20,
        nombreCapturista: 'Juan',
        apellidoPaternoCapturista: 'Pérez',
        apellidoMaternoCapturista: 'López',
        nombreCompletoCapturista: 'Juan Pérez López',
        idSupervisor: 15,
        nombreSupervisor: 'María',
        apellidoPaternoSupervisor: 'Torres',
        apellidoMaternoSupervisor: 'García',
        nombreCompletoSupervisor: 'María Torres García',
      }),
    );
  });

  it('sin Licencias ni visita devuelve atributos relacionados en null', async () => {
    const { licenciasRepository, visitasQb, usuariosRepository, service } =
      createListService({
        registros: [
          { ...baseRegistro, id: 151, predioObra: 1 } as Registros,
        ],
        licencias: [],
        visitas: [],
      });

    const result = await service.findAll(user({ rol: 4 }));

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('Licencias');
    expect(result[0]).not.toHaveProperty('CapturistaVisita');
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 151,
        predioObra: 1,
        idLicencia: null,
        idRegistroLicencia: null,
        registroLicencia: null,
        nombreComercial: null,
        giro: null,
        licenciaSuelo: null,
        nombrePropietario: null,
        apellidoPaternoPropietario: null,
        apellidoMaternoPropietario: null,
        tipoPersona: null,
        rfc: null,
        fechaExpedicion: null,
        fechaRefrendo: null,
        estacionamiento: null,
        tipoLicencia: null,
        fechaHoraLicencia: null,
        fechaCreacionLicencia: null,
        fechaActualizacionLicencia: null,
        idCapturistaVisita: null,
        idCapturista: null,
        nombreCompletoCapturista: null,
        idSupervisor: null,
        nombreCompletoSupervisor: null,
        idGrupoCapturistaVisita: null,
        fechaHoraCapturistaVisita: null,
      }),
    );
    expect(licenciasRepository.createQueryBuilder).toHaveBeenCalled();
    expect(visitasQb.where).toHaveBeenCalled();
    expect(usuariosRepository.find).not.toHaveBeenCalled();
  });

  it('no consulta Licencias ni visitas cuando el listado está vacío', async () => {
    const { licenciasRepository, capturistaVisitaRepository, service } =
      createListService();
    await service.findAll(user({ rol: 4 }));
    expect(licenciasRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(capturistaVisitaRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('elige la Licencias y visita de Id más reciente ante duplicados', async () => {
    const { service } = createListService({
      registros: [baseRegistro],
      licencias: [
        {
          id: 30,
          idRegistro: 150,
          nombreComercial: 'Reciente',
          registro: null,
          giro: null,
          licenciaSuelo: null,
          nombrePropietario: null,
          apellidoPaternoPropietario: null,
          apellidoMaternoPropietario: null,
          tipoPersona: null,
          rfc: null,
          fechaExpedicion: null,
          fechaRefrendo: null,
          estacionamiento: null,
          tipo: null,
          fechaHora: null,
          fechaCreacion: null,
          fechaActualizacion: null,
        },
        {
          id: 10,
          idRegistro: 150,
          nombreComercial: 'Antigua',
          registro: null,
          giro: null,
          licenciaSuelo: null,
          nombrePropietario: null,
          apellidoPaternoPropietario: null,
          apellidoMaternoPropietario: null,
          tipoPersona: null,
          rfc: null,
          fechaExpedicion: null,
          fechaRefrendo: null,
          estacionamiento: null,
          tipo: null,
          fechaHora: null,
          fechaCreacion: null,
          fechaActualizacion: null,
        },
      ],
      visitas: [
        {
          id: 5,
          idRegistro: 150,
          idCapturista: 20,
          idSupervisor: null,
          idGrupo: 7,
          fechaHora: new Date('2026-07-17T10:00:00.000Z'),
        },
        {
          id: 2,
          idRegistro: 150,
          idCapturista: 99,
          idSupervisor: null,
          idGrupo: 7,
          fechaHora: new Date('2026-07-16T10:00:00.000Z'),
        },
      ],
      usuarios: [
        {
          id: 20,
          nombre: 'Reciente',
          apellidoPaterno: null,
          apellidoMaterno: null,
        },
      ],
    });

    const result = await service.findAll(user({ rol: 4 }));

    expect(result).toHaveLength(1);
    expect(result[0].idLicencia).toBe(30);
    expect(result[0].nombreComercial).toBe('Reciente');
    expect(result[0].idCapturistaVisita).toBe(5);
    expect(result[0].idCapturista).toBe(20);
    expect(result[0].nombreCompletoCapturista).toBe('Reciente');
  });

  it('no envuelve en data ni anida Licencias/CapturistaVisita', async () => {
    const { service } = createListService({
      registros: [baseRegistro],
      licencias: [],
      visitas: [],
    });

    const result = await service.findAll(user({ rol: 4 }));

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 150,
        municipio: 'Cuernavaca',
        estatus: 4,
        idLicencia: null,
        idCapturista: null,
      }),
    );
    expect(result).not.toHaveProperty('data');
    expect(result).not.toHaveProperty('paginated');
    expect(result[0]).not.toHaveProperty('Licencias');
    expect(result[0]).not.toHaveProperty('licencias');
    expect(result[0]).not.toHaveProperty('CapturistaVisita');
    expect(result[0]).not.toHaveProperty('Sapac');
  });
});

describe('MonitoreoService.findOne', () => {
  it('rechaza id inválido (0, negativo)', async () => {
    const { service, registrosRepository } = createDetailService();

    await expect(service.findOne(0, user({ rol: 4 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.findOne(-1, user({ rol: 4 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(registrosRepository.findOne).not.toHaveBeenCalled();
  });

  it('responde 404 si el registro no existe', async () => {
    const { service } = createDetailService({ registro: null });
    await expect(service.findOne(150, user({ rol: 4 }))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('consulta solo por Id e incluye capturista/supervisor planos', async () => {
    const fechaVisita = new Date('2026-07-17T00:32:08.000Z');
    const { service, registrosRepository, visitasQb, usuariosRepository } =
      createDetailService({
        registro: baseRegistro,
        capturistaVisita: {
          id: 4,
          idRegistro: 150,
          idCapturista: 20,
          idSupervisor: 15,
          idGrupo: 7,
          fechaHora: fechaVisita,
        } as CapturistaVisita,
        usuarios: [
          {
            id: 20,
            nombre: 'Juan',
            apellidoPaterno: 'Pérez',
            apellidoMaterno: 'López',
          },
          {
            id: 15,
            nombre: 'María',
            apellidoPaterno: 'Torres',
            apellidoMaterno: 'García',
          },
        ],
        sapac: {
          id: 2,
          numeroCuenta: '123',
          nombre: 'Juan',
          apellidoPaterno: null,
          apellidoMaterno: null,
          rfc: null,
          sector: null,
          ruta: null,
          folio: null,
          idTipoServicio: 1,
          medidor: null,
        },
        fotos: [
          {
            id: 10,
            idTipoFoto: 3,
            ruta: 'https://springtelecom.mx/registros/data/150/3/a.pdf',
          },
        ],
      });

    const result = await service.findOne(150, user({ rol: 4 }));

    expect(registrosRepository.findOne).toHaveBeenCalledWith({
      where: { id: 150 },
    });
    expect(visitasQb.where).toHaveBeenCalledWith(
      'capturistaVisita.idRegistro IN (:...idsRegistro)',
      { idsRegistro: [150] },
    );
    expect(visitasQb.orderBy).toHaveBeenCalledWith(
      'capturistaVisita.fechaHora',
      'DESC',
    );
    expect(usuariosRepository.find).toHaveBeenCalled();
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 150,
        predioObra: 0,
        tipoRegistro: 1,
        municipio: 'Cuernavaca',
        idCapturistaVisita: 4,
        idRegistroCapturistaVisita: 150,
        idCapturista: 20,
        nombreCapturista: 'Juan',
        apellidoPaternoCapturista: 'Pérez',
        apellidoMaternoCapturista: 'López',
        nombreCompletoCapturista: 'Juan Pérez López',
        idSupervisor: 15,
        nombreSupervisor: 'María',
        apellidoPaternoSupervisor: 'Torres',
        apellidoMaternoSupervisor: 'García',
        nombreCompletoSupervisor: 'María Torres García',
        idGrupoCapturistaVisita: 7,
        fechaHoraCapturistaVisita: fechaVisita,
      }),
    );
    expect(result.data).not.toHaveProperty('CapturistaVisita');
    expect(result.data).not.toHaveProperty('capturista');
    expect(result.data).not.toHaveProperty('supervisor');
    expect(result.data).not.toHaveProperty('passwordHash');
    expect(result.data).not.toHaveProperty('PasswordHash');
    expect(result.data.Sapac).toEqual(
      expect.objectContaining({
        NumeroCuenta: '123',
        IdTipoServicio: 1,
        reciboSapac:
          'https://springtelecom.mx/registros/data/150/3/a.pdf',
      }),
    );
    expect(result.data).not.toHaveProperty('LicenciaConstruccion');
  });

  it('omite apellido materno vacío en nombreCompleto', async () => {
    const { service } = createDetailService({
      registro: baseRegistro,
      capturistaVisita: {
        id: 1,
        idRegistro: 150,
        idCapturista: 20,
        idSupervisor: 15,
        idGrupo: 7,
        fechaHora: new Date(),
      } as CapturistaVisita,
      usuarios: [
        {
          id: 20,
          nombre: 'Juan',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: null,
        },
        {
          id: 15,
          nombre: null,
          apellidoPaterno: null,
          apellidoMaterno: null,
        },
      ],
    });

    const result = await service.findOne(150, user({ rol: 4 }));

    expect(result.data.nombreCompletoCapturista).toBe('Juan Pérez');
    expect(result.data.idSupervisor).toBe(15);
    expect(result.data.nombreCompletoSupervisor).toBeNull();
  });

  it('conserva idCapturista si el usuario no existe', async () => {
    const { service, usuariosRepository } = createDetailService({
      registro: baseRegistro,
      capturistaVisita: {
        id: 1,
        idRegistro: 150,
        idCapturista: 99,
        idSupervisor: 88,
        idGrupo: 7,
        fechaHora: new Date(),
      } as CapturistaVisita,
      usuarios: [],
    });

    const result = await service.findOne(150, user({ rol: 4 }));

    expect(usuariosRepository.find).toHaveBeenCalled();
    expect(result.data.idCapturista).toBe(99);
    expect(result.data.idSupervisor).toBe(88);
    expect(result.data.nombreCapturista).toBeNull();
    expect(result.data.nombreCompletoCapturista).toBeNull();
    expect(result.data.nombreCompletoSupervisor).toBeNull();
  });

  it('PredioObra=1 incluye campos planos de visita', async () => {
    const registro = { ...baseRegistro, predioObra: 1, id: 151 } as Registros;
    const {
      service,
      licenciaConstruccionRepository,
      corresponsablesRepository,
      fotosLicenciaConstruccionRepository,
      sapacRepository,
    } = createDetailService({
      registro,
      capturistaVisita: {
        id: 2,
        idRegistro: 151,
        idCapturista: 20,
        idSupervisor: null,
        idGrupo: 7,
        fechaHora: new Date(),
      } as CapturistaVisita,
      usuarios: [
        {
          id: 20,
          nombre: 'Ana',
          apellidoPaterno: 'Ruiz',
          apellidoMaterno: null,
        },
      ],
      licenciaConstruccion: {
        id: 9,
        idRegistro: 151,
        tipoSolicitudLicencia: 1,
        descripcionProyecto: 'Obra',
        superficieTerrenoM2: null,
        superficieTerrenoObraM2: null,
        descripcionSistemaConstructivo: null,
        nombrePropietario: 'Prop',
        domicilioNotificacion: null,
        rfc: null,
        nombreDRO: null,
        noRegLicenciaConstruccion: null,
        cedulaProfesional: null,
        fecha: null,
        numeroExpediente: null,
        numeroControl: null,
        seguimientoObra: null,
        constanciaAlineamiento: null,
        licenciaUsoSuelo: null,
        planoAutorizado: null,
        licenciaFraccionamiento: null,
        escrituras: null,
        factibilidadAguaPotable: null,
        recibosPagoPredial: null,
        recibosMunicipales: null,
        planoArquitectonicos: null,
        otros: null,
      },
      corresponsables: [
        {
          id: 1,
          nombreCompleto: 'Corresponsable Uno',
          noRegLicenciaConstruccion: 'REG-001',
          cedulaProfesional: 'CED-001',
        },
      ],
      fotosLc: [
        {
          id: 1,
          idTipoFoto: 10,
          ruta: 'https://springtelecom.mx/registros/data/151/10/d1.pdf',
        },
        {
          id: 2,
          idTipoFoto: 10,
          ruta: 'https://springtelecom.mx/registros/data/151/10/d2.pdf',
        },
        {
          id: 3,
          idTipoFoto: 25,
          ruta: 'https://springtelecom.mx/registros/data/151/25/firma.png',
        },
      ],
    });

    const result = await service.findOne(151, user({ rol: 4 }));
    const lc = result.data.LicenciaConstruccion as Record<string, unknown>;

    expect(licenciaConstruccionRepository.findOne).toHaveBeenCalled();
    expect(corresponsablesRepository.find).toHaveBeenCalledWith({
      where: { idLicenciaConstruccion: 9 },
      order: { id: 'ASC' },
    });
    expect(fotosLicenciaConstruccionRepository.find).toHaveBeenCalled();
    expect(sapacRepository.findOne).not.toHaveBeenCalled();
    expect(result.data).not.toHaveProperty('Sapac');
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 151,
        predioObra: 1,
        idCapturista: 20,
        nombreCompletoCapturista: 'Ana Ruiz',
        idSupervisor: null,
        nombreCompletoSupervisor: null,
      }),
    );
    expect(result.data).not.toHaveProperty('CapturistaVisita');
    expect(lc.Corresponsables).toEqual([
      expect.objectContaining({
        NombreCompleto: 'Corresponsable Uno',
        NoRegLicenciaConstruccion: 'REG-001',
      }),
    ]);
    expect(lc.constanciaAlineamientoyNumero).toEqual([
      'https://springtelecom.mx/registros/data/151/10/d1.pdf',
      'https://springtelecom.mx/registros/data/151/10/d2.pdf',
    ]);
    expect(lc.LicenciaUsoyPlano).toEqual([]);
    expect(lc.FirmaPropietario).toBe(
      'https://springtelecom.mx/registros/data/151/25/firma.png',
    );
    expect(lc.FirmaDRO).toBeNull();
  });

  it('sin CapturistaVisita rellena atributos null y no lanza 500', async () => {
    const { service, usuariosRepository } = createDetailService({
      registro: baseRegistro,
      capturistaVisita: null,
      sapac: null,
      catastro: null,
      licencias: null,
      contacto: null,
      proteccionCivil: null,
      contactoRepresentante: null,
      fotos: [],
    });

    const result = await service.findOne(150, user({ rol: 4 }));

    expect(usuariosRepository.find).not.toHaveBeenCalled();
    expect(result.data).not.toHaveProperty('CapturistaVisita');
    expect(result.data).toEqual(
      expect.objectContaining({
        idCapturistaVisita: null,
        idCapturista: null,
        nombreCompletoCapturista: null,
        idSupervisor: null,
        nombreCompletoSupervisor: null,
        idGrupoCapturistaVisita: null,
        fechaHoraCapturistaVisita: null,
      }),
    );
    expect(result.data.Sapac).toBeNull();
    expect(result.data.Catastro).toBeNull();
    expect(result.data.Licencias).toBeNull();
    expect(result.data.ProteccionCivil).toBeNull();
  });

  it('rol 4 consulta por Id sin filtro adicional', async () => {
    const { service, registrosRepository, capturistaVisitaRepository } =
      createDetailService({
        registro: baseRegistro,
      });

    await service.findOne(150, user({ rol: 4 }));

    expect(registrosRepository.findOne).toHaveBeenCalledWith({
      where: { id: 150 },
    });
    expect(capturistaVisitaRepository.findOne).not.toHaveBeenCalledWith({
      where: { idRegistro: 150, idGrupo: expect.anything() },
    });
    expect(capturistaVisitaRepository.findOne).not.toHaveBeenCalledWith({
      where: { idRegistro: 150, idCapturista: expect.anything() },
    });
  });

  it('rol 2 y rol 1 aplican visibilidad en el detalle', async () => {
    const rol2 = createDetailService({
      registro: baseRegistro,
      capturistaVisita: {
        id: 1,
        idRegistro: 150,
        idCapturista: 20,
        idSupervisor: 15,
        idGrupo: 7,
        fechaHora: new Date(),
      } as CapturistaVisita,
    });
    await rol2.service.findOne(150, user({ rol: 2, idGrupo: 7 }));
    expect(rol2.capturistaVisitaRepository.findOne).toHaveBeenCalledWith({
      where: { idRegistro: 150, idGrupo: 7 },
    });

    const rol1 = createDetailService({
      registro: baseRegistro,
      capturistaVisita: {
        id: 1,
        idRegistro: 150,
        idCapturista: 30,
        idSupervisor: 15,
        idGrupo: 7,
        fechaHora: new Date(),
      } as CapturistaVisita,
    });
    await rol1.service.findOne(150, user({ rol: 1, userId: 30 }));
    expect(rol1.capturistaVisitaRepository.findOne).toHaveBeenCalledWith({
      where: { idRegistro: 150, idCapturista: 30 },
    });
  });

  it('detalle fuera de alcance recibe 403', async () => {
    const { service } = createDetailService({
      registro: baseRegistro,
      capturistaVisita: null,
    });

    await expect(
      service.findOne(150, user({ rol: 2, idGrupo: 99 })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
