import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Catastro } from 'src/entities/Catastro';
import { Contactos } from 'src/entities/Contactos';
import { Corresponsables } from 'src/entities/Corresponsables';
import { FotosLicenciaConstruccion } from 'src/entities/FotosLicenciaConstruccion';
import { LicenciaConstruccion } from 'src/entities/LicenciaConstruccion';
import { Licencias } from 'src/entities/Licencias';
import { ProteccionCivil } from 'src/entities/ProteccionCivil';
import { Registros } from 'src/entities/Registros';
import { Sapac } from 'src/entities/Sapac';
import { TipoFoto } from 'src/entities/TipoFoto';
import { Fotos } from 'src/entities/Fotos';
import { LC_FILE_FIELD_NAMES } from 'src/registros/licencia-construccion.constants';
import { LicenciaConstruccionStorageService } from 'src/registros/licencia-construccion-storage.service';
import { SAPAC_FILE_FIELD_NAMES } from 'src/registros/sapac.constants';
import { SapacStorageService } from 'src/registros/sapac-storage.service';
import { parseRegistroActualizarMultipart } from './registro-actualizar-form.parser';
import {
  assignUseful,
  hasUsefulValues,
  tieneValorActualizable,
} from './registro-actualizar.util';
import { RegistrosActualizarService } from './registros-actualizar.service';

describe('registro-actualizar.util', () => {
  it('tieneValorActualizable conserva 0 y rechaza vacíos', () => {
    expect(tieneValorActualizable(0)).toBe(true);
    expect(tieneValorActualizable('0')).toBe(true);
    expect(tieneValorActualizable('')).toBe(false);
    expect(tieneValorActualizable('   ')).toBe(false);
    expect(tieneValorActualizable(null)).toBe(false);
    expect(tieneValorActualizable(undefined)).toBe(false);
  });

  it('assignUseful no sobrescribe con vacíos', () => {
    const target = { nombre: 'Juan', medidor: 'ABC', cuenta: '123' };
    assignUseful(target, {
      nombre: 'Pedro',
      medidor: '',
      cuenta: null,
      extra: undefined,
    });
    expect(target).toEqual({
      nombre: 'Pedro',
      medidor: 'ABC',
      cuenta: '123',
    });
  });

  it('hasUsefulValues detecta 0', () => {
    expect(hasUsefulValues({ TienePrograma: 0 })).toBe(true);
    expect(hasUsefulValues({ Nombre: '' })).toBe(false);
  });
});

describe('parseRegistroActualizarMultipart', () => {
  it('parsea Sapac cuando PredioObra efectivo es 0', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Sapac.NumeroCuenta': '123',
        'Sapac.IdTipoServicio': '1',
      },
      0,
    );
    expect(parsed.hasSapac).toBe(true);
    expect(parsed.sapac?.NumeroCuenta).toBe('123');
    expect(parsed.sapac?.IdTipoServicio).toBe(1);
  });

  it('ignora Sapac cuando PredioObra efectivo es 1', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        Calle: 'X',
        'Sapac.NumeroCuenta': '123',
      },
      1,
    );
    expect(parsed.hasSapac).toBe(false);
    expect(parsed.sapac).toBeUndefined();
    expect(parsed.hasRootUsefulFields).toBe(true);
  });

  it('ignora LicenciaConstruccion cuando PredioObra efectivo es 0', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        Calle: 'X',
        'LicenciaConstruccion.DescripcionProyecto': 'Obra',
      },
      0,
    );
    expect(parsed.hasRootUsefulFields).toBe(true);
    expect(parsed.hasLicenciaConstruccion).toBe(false);
    expect(parsed.licenciaConstruccion).toBeUndefined();
  });

  it('parsea LicenciaConstruccion y Corresponsables cuando PredioObra es 1', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'LicenciaConstruccion.TipoSolicitudLicencia': '2',
        'LicenciaConstruccion.SuperficieTerrenoM2': '0',
        'LicenciaConstruccion.Corresponsables[0].Id': '5',
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Arq Uno',
        'LicenciaConstruccion.Corresponsables[1].NombreCompleto': 'Arq Dos',
      },
      1,
    );
    expect(parsed.hasLicenciaConstruccion).toBe(true);
    expect(parsed.hasCorresponsables).toBe(true);
    expect(parsed.licenciaConstruccion?.TipoSolicitudLicencia).toBe(2);
    expect(parsed.licenciaConstruccion?.SuperficieTerrenoM2).toBe(0);
    expect(parsed.licenciaConstruccion?.Corresponsables).toHaveLength(2);
    expect(parsed.licenciaConstruccion?.Corresponsables?.[0].Id).toBe(5);
  });

  it('rechaza TipoSolicitudLicencia inválido', async () => {
    await expect(
      parseRegistroActualizarMultipart(
        {
          idRegistro: '10',
          'LicenciaConstruccion.TipoSolicitudLicencia': '5',
        },
        1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parsea nuevos campos escalares de LicenciaConstruccion con 0 válido', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'LicenciaConstruccion.NumeroExpediente': 'EXP-2026-002',
        'LicenciaConstruccion.NumeroControl': 'CTRL-002',
        'LicenciaConstruccion.SeguimientoObra': 'En revisión',
        'LicenciaConstruccion.ClaveCatastral': '1100-01-002-003',
        'LicenciaConstruccion.ConstanciaAlineamiento': '0',
        'LicenciaConstruccion.LicenciaUsoSuelo': '1',
        'LicenciaConstruccion.Otros': '0',
      },
      1,
    );

    expect(parsed.hasLicenciaConstruccion).toBe(true);
    expect(parsed.licenciaConstruccion?.NumeroExpediente).toBe('EXP-2026-002');
    expect(parsed.licenciaConstruccion?.NumeroControl).toBe('CTRL-002');
    expect(parsed.licenciaConstruccion?.SeguimientoObra).toBe('En revisión');
    expect(parsed.licenciaConstruccion?.ClaveCatastral).toBe('1100-01-002-003');
    expect(parsed.licenciaConstruccion?.ConstanciaAlineamiento).toBe(0);
    expect(parsed.licenciaConstruccion?.LicenciaUsoSuelo).toBe(1);
    expect(parsed.licenciaConstruccion?.Otros).toBe(0);
  });

  it('rechaza indicador LicenciaConstruccion fuera de 0|1', async () => {
    await expect(
      parseRegistroActualizarMultipart(
        {
          idRegistro: '10',
          'LicenciaConstruccion.ConstanciaAlineamiento': '2',
        },
        1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora vacíos en LC sin marcar hasLicenciaConstruccion', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'LicenciaConstruccion.NumeroControl': '',
        'LicenciaConstruccion.SeguimientoObra': '   ',
        'LicenciaConstruccion.ClaveCatastral': '   ',
        'LicenciaConstruccion.PlanoAutorizado': null,
      },
      1,
    );

    expect(parsed.hasLicenciaConstruccion).toBe(false);
  });

  it('acepta Licencias.FechaHora (no está prohibido como en Sapac)', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Licencias.FechaHora': '2026-07-17T22:14:36.518Z',
        'Licencias.NombreComercial': 'Tienda',
      },
      0,
    );
    expect(parsed.hasLicencias).toBe(true);
    expect(parsed.licencias?.FechaHora).toBe('2026-07-17T22:14:36.518Z');
  });

  it('ignora Correo placeholder sin @ (sin registro) en ContactoRepresentante', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'ProteccionCivil.EsEmpresa': '1',
        'Licencias.ContactoRepresentante.Nombre': 'sin registro',
        'Licencias.ContactoRepresentante.Correo': 'sin registro',
      },
      0,
    );
    expect(parsed.hasContactoRepresentante).toBe(true);
    expect(parsed.contactoRepresentante?.Nombre).toBe('sin registro');
    expect(parsed.contactoRepresentante?.Correo).toBeUndefined();
  });

  it('parsea Licencias.ContactoRepresentante y no ProteccionCivil.ContactoRepresentante', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Licencias.ContactoRepresentante.Nombre': 'Juan',
        'Licencias.ContactoRepresentante.Telefono': '7771234567',
        'Licencias.ContactoRepresentante.Correo': 'juan@example.com',
      },
      0,
    );
    expect(parsed.hasContactoRepresentante).toBe(true);
    expect(parsed.contactoRepresentante).toEqual(
      expect.objectContaining({
        Nombre: 'Juan',
        Telefono: '7771234567',
        Correo: 'juan@example.com',
      }),
    );
    expect(parsed.hasProteccionCivil).toBe(false);

    await expect(
      parseRegistroActualizarMultipart(
        {
          idRegistro: '10',
          'ProteccionCivil.ContactoRepresentante.Nombre': 'Juan',
        },
        0,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora Licencias.ContactoRepresentante cuando PredioObra efectivo es 1', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        PredioObra: '1',
        'Licencias.ContactoRepresentante.Nombre': 'No debe guardar',
      },
      1,
    );
    expect(parsed.hasContactoRepresentante).toBe(false);
    expect(parsed.contactoRepresentante).toBeUndefined();
  });

  it('rechaza Correo con @ inválido', async () => {
    await expect(
      parseRegistroActualizarMultipart(
        {
          idRegistro: '10',
          'Licencias.Contacto.Correo': 'no-es-valido@',
        },
        0,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('conserva TienePrograma=0 y Estacionamiento=0', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Licencias.Estacionamiento': '0',
        'ProteccionCivil.TienePrograma': '0',
        'ProteccionCivil.EsEmpresa': '1',
      },
      0,
    );
    expect(parsed.licencias?.Estacionamiento).toBe(0);
    expect(parsed.proteccionCivil?.TienePrograma).toBe(0);
    expect(parsed.hasLicencias).toBe(true);
    expect(parsed.hasProteccionCivil).toBe(true);
  });

  it('parsea Licencias.RazonSocial y cuenta como dato útil', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Licencias.RazonSocial':
          '  Comercializadora Ejemplo, S.A. de C.V.  ',
      },
      0,
    );
    expect(parsed.hasLicencias).toBe(true);
    expect(parsed.licencias?.RazonSocial).toBe(
      'Comercializadora Ejemplo, S.A. de C.V.',
    );
  });

  it('ignora Licencias.RazonSocial cuando PredioObra efectivo es 1', async () => {
    const parsed = await parseRegistroActualizarMultipart(
      {
        idRegistro: '10',
        'Licencias.RazonSocial': 'No debe guardar',
      },
      1,
    );
    expect(parsed.hasLicencias).toBe(false);
    expect(parsed.licencias).toBeUndefined();
  });
});

describe('RegistrosActualizarService.updateFromMultipart', () => {
  function createService(options?: {
    registro?: Registros | null;
    sapac?: Sapac | null;
    licencias?: Licencias | null;
    licenciaConstruccion?: LicenciaConstruccion | null;
    corresponsables?: Corresponsables[];
    failOnSave?: boolean;
    tipoFotoIds?: number[];
  }) {
    const registro =
      options?.registro === undefined
        ? ({
            id: 10,
            calle: 'Anterior',
            predioObra: 0,
            tipoRegistro: 1,
            estatus: 4,
            municipio: 'Cuernavaca',
          } as Registros)
        : options.registro;

    const sapac = options?.sapac === undefined ? null : options.sapac;
    const licencias =
      options?.licencias === undefined ? null : options.licencias;
    const lc =
      options?.licenciaConstruccion === undefined
        ? null
        : options.licenciaConstruccion;
    const corresponsablesList = options?.corresponsables ?? [];
    const tipoFotoIds = options?.tipoFotoIds ?? [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 25, 26,
      27, 28, 29, 31, 32,
    ];

    const saved: unknown[] = [];
    let nextId = 50;

    const manager = {
      findOne: jest.fn().mockImplementation((entity, opts?: { where?: Record<string, unknown> }) => {
        if (entity === Registros) return Promise.resolve(registro);
        if (entity === Sapac) return Promise.resolve(sapac);
        if (entity === Catastro) return Promise.resolve(null);
        if (entity === Licencias) return Promise.resolve(licencias);
        if (entity === Contactos) return Promise.resolve(null);
        if (entity === ProteccionCivil) return Promise.resolve(null);
        if (entity === LicenciaConstruccion) return Promise.resolve(lc);
        if (entity === Corresponsables) {
          const id = opts?.where?.id;
          const found = corresponsablesList.find((c) => Number(c.id) === Number(id));
          return Promise.resolve(found ?? null);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((_e, data) => ({ ...data })),
      save: jest.fn().mockImplementation(async (entityOrData, maybe?) => {
        if (options?.failOnSave) {
          throw new Error('db fail');
        }
        const data = maybe ?? entityOrData;
        const row = { id: (data as { id?: number }).id ?? nextId++, ...data };
        saved.push(row);
        return row;
      }),
      query: jest.fn().mockResolvedValue([{ Id: 1 }]),
    } as unknown as EntityManager;

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === TipoFoto) {
          return {
            find: jest.fn().mockResolvedValue(
              tipoFotoIds.map((id) => ({ id })),
            ),
          };
        }
        return {
          findOne: jest.fn().mockResolvedValue(registro),
        };
      }),
      transaction: jest.fn().mockImplementation(async (cb) => cb(manager)),
    } as unknown as DataSource;

    const storageService = {
      assertValidLcFiles: jest.fn(),
      saveLcFiles: jest.fn().mockResolvedValue({
        saved: [
          {
            key: 'FirmaPropietario',
            idTipoFoto: 25,
            fileName: 'uuid.png',
            absolutePath: '/tmp/10/25/uuid.png',
            publicUrl: 'https://cdn.example/registros/data/10/25/uuid.png',
          },
        ],
        absoluteCreated: ['/tmp/10/25/uuid.png'],
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as unknown as LicenciaConstruccionStorageService;

    const sapacStorageService = {
      assertValidPhotoInputs: jest.fn(),
      saveRegistroPhotos: jest.fn().mockResolvedValue({
        saved: [
          {
            key: SAPAC_FILE_FIELD_NAMES.reciboSapac,
            idTipoFoto: 3,
            fileName: 'nuevo.jpg',
            absolutePath: '/tmp/10/3/nuevo.jpg',
            publicUrl: 'https://cdn.example/registros/data/10/3/nuevo.jpg',
          },
        ],
        absoluteCreated: ['/tmp/10/3/nuevo.jpg'],
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as unknown as SapacStorageService;

    const service = new RegistrosActualizarService(
      dataSource,
      storageService,
      sapacStorageService,
    );
    return {
      service,
      manager,
      dataSource,
      registro,
      saved,
      storageService,
      sapacStorageService,
      lc,
    };
  }

  const fakePng = (field: string): Express.Multer.File =>
    ({
      fieldname: field,
      originalname: 'x.png',
      mimetype: 'image/png',
      buffer: Buffer.from('png'),
      size: 3,
    }) as Express.Multer.File;

  it('actualiza Calle y crea Sapac cuando PredioObra efectivo es 0', async () => {
    const { service, manager, registro } = createService({ sapac: null });

    const result = await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Avenida Universidad',
      'Sapac.NumeroCuenta': '999',
      'Sapac.IdTipoServicio': '1',
    });

    expect(registro!.calle).toBe('Avenida Universidad');
    expect(registro!.estatus).toBe(4);
    expect(manager.create).toHaveBeenCalledWith(
      Sapac,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(result.status).toBe('success');
    expect(result.message).toBe('Registro actualizado correctamente');
  });

  it('no procesa Sapac cuando PredioObra almacenado es 1', async () => {
    const registro = {
      id: 10,
      calle: 'X',
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, manager } = createService({ registro });

    await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Nueva',
      'Sapac.NumeroCuenta': '999',
    });

    expect(registro.calle).toBe('Nueva');
    expect(manager.create).not.toHaveBeenCalledWith(
      Sapac,
      expect.anything(),
    );
  });

  it('usa PredioObra del body al cambiar 1→0 y crea Sapac', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
      calle: 'A',
    } as Registros;
    const { service, manager } = createService({ registro, sapac: null });

    await service.updateFromMultipart({
      idRegistro: '10',
      PredioObra: '0',
      'Sapac.NumeroCuenta': '12345',
    });

    expect(registro.predioObra).toBe(0);
    expect(manager.create).toHaveBeenCalledWith(
      Sapac,
      expect.objectContaining({ idRegistro: 10 }),
    );
  });

  it('no sobrescribe Sapac con valores vacíos', async () => {
    const sapac = {
      id: 5,
      idRegistro: 10,
      numeroCuenta: '123',
      nombre: 'Juan',
      medidor: 'ABC',
    } as Sapac;
    const { service } = createService({ sapac });

    await service.updateFromMultipart({
      idRegistro: '10',
      'Sapac.Nombre': 'Pedro',
      'Sapac.NumeroCuenta': '',
      'Sapac.Medidor': '   ',
    });

    expect(sapac.nombre).toBe('Pedro');
    expect(sapac.numeroCuenta).toBe('123');
    expect(sapac.medidor).toBe('ABC');
  });

  it('404 si no existe el registro', async () => {
    const { service } = createService({ registro: null });
    await expect(
      service.updateFromMultipart({
        idRegistro: '999',
        Calle: 'X',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400 sin campos útiles', async () => {
    const { service } = createService();
    await expect(
      service.updateFromMultipart({ idRegistro: '10' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('establece Estatus=4 al actualizar datos generales (desde 1)', async () => {
    const registro = {
      id: 10,
      calle: 'Anterior',
      predioObra: 0,
      estatus: 1,
    } as Registros;
    const { service } = createService({ registro });

    await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Nueva Calle',
    });

    expect(registro.estatus).toBe(4);
  });

  it('establece Estatus=4 al actualizar Licencias.RazonSocial (desde 2)', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 2,
    } as Registros;
    const { service } = createService({
      registro,
      licencias: { id: 5, idRegistro: 10, razonSocial: 'Vieja' } as Licencias,
    });

    await service.updateFromMultipart({
      idRegistro: '10',
      'Licencias.RazonSocial': 'Nueva SA',
    });

    expect(registro.estatus).toBe(4);
  });

  it('establece Estatus=4 al actualizar fotografías', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 3,
    } as Registros;
    const { service } = createService({ registro });

    await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fakePng(SAPAC_FILE_FIELD_NAMES.reciboSapac),
        ],
      },
    );

    expect(registro.estatus).toBe(4);
  });

  it('fuerza Estatus=4 aunque el valor previo sea distinto de 4', async () => {
    const registro = {
      id: 10,
      calle: 'X',
      predioObra: 0,
      estatus: 5,
    } as Registros;
    const { service } = createService({ registro });

    await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Y',
    });

    expect(registro.estatus).toBe(4);
  });

  it('no cambia Estatus si la solicitud no tiene datos válidos', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 2,
    } as Registros;
    const { service } = createService({ registro });

    await expect(
      service.updateFromMultipart({ idRegistro: '10' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(registro.estatus).toBe(2);
  });

  it('no persiste Estatus=4 si la transacción falla', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 1,
      calle: 'Original',
    } as Registros;
    const { service, dataSource } = createService({
      registro,
      failOnSave: true,
    });

    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        Calle: 'Nueva',
      }),
    ).rejects.toThrow('db fail');
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('400 con solo LC vacía', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service } = createService({ registro });
    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        'LicenciaConstruccion.DescripcionProyecto': '',
        'LicenciaConstruccion.NombrePropietario': '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualiza TienePrograma=0', async () => {
    const { service, manager } = createService();

    await service.updateFromMultipart({
      idRegistro: '10',
      'ProteccionCivil.EsEmpresa': '1',
      'ProteccionCivil.TienePrograma': '0',
    });

    expect(manager.create).toHaveBeenCalledWith(
      ProteccionCivil,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(manager.save).toHaveBeenCalled();
  });

  it('actualiza Licencias.RazonSocial sin borrar con vacíos', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 4,
    } as Registros;
    const licencias = {
      id: 7,
      idRegistro: 10,
      nombreComercial: 'Comercio Anterior',
      rfc: 'ABC010101XYZ',
      razonSocial: 'Empresa Anterior, S.A. de C.V.',
    } as Licencias;
    const { service } = createService({ registro, licencias });

    await service.updateFromMultipart({
      idRegistro: '10',
      'Licencias.RazonSocial': 'Empresa Nueva, S.A. de C.V.',
      'Licencias.NombreComercial': '',
    });

    expect(licencias.razonSocial).toBe('Empresa Nueva, S.A. de C.V.');
    expect(licencias.nombreComercial).toBe('Comercio Anterior');
    expect(licencias.rfc).toBe('ABC010101XYZ');
  });

  it('acepta PATCH solo con Licencias.RazonSocial cuando PredioObra efectivo es 0', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 4,
    } as Registros;
    const licencias = {
      id: 7,
      idRegistro: 10,
      razonSocial: null,
    } as Licencias;
    const { service } = createService({ registro, licencias });

    await service.updateFromMultipart({
      idRegistro: '10',
      'Licencias.RazonSocial': 'Empresa Nueva, S.A. de C.V.',
    });

    expect(licencias.razonSocial).toBe('Empresa Nueva, S.A. de C.V.');
  });

  it('ignora Licencias.RazonSocial cuando PredioObra efectivo es 1 y conserva histórico', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const licencias = {
      id: 7,
      idRegistro: 10,
      razonSocial: 'Empresa Histórica, S.A. de C.V.',
    } as Licencias;
    const { service } = createService({ registro, licencias });

    await service.updateFromMultipart({
      idRegistro: '10',
      PredioObra: '1',
      'Licencias.RazonSocial': 'Empresa No Permitida, S.A. de C.V.',
      'LicenciaConstruccion.DescripcionProyecto': 'Obra',
    });

    expect(licencias.razonSocial).toBe('Empresa Histórica, S.A. de C.V.');
  });

  it('crea LicenciaConstruccion cuando PredioObra efectivo es 1', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, manager } = createService({
      registro,
      licenciaConstruccion: null,
    });

    const result = await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.TipoSolicitudLicencia': '2',
      'LicenciaConstruccion.DescripcionProyecto': 'Construcción nueva',
      'LicenciaConstruccion.SuperficieTerrenoM2': '0',
    });

    expect(manager.create).toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        predioObra: 1,
        idLicenciaConstruccion: expect.any(Number),
      }),
    );
    expect(registro.estatus).toBe(4);
  });

  it('actualiza LicenciaConstruccion existente sin vacíos', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = {
      id: 8,
      idRegistro: 10,
      descripcionProyecto: 'Anterior',
      nombrePropietario: 'Juan',
      superficieTerrenoM2: 100,
    } as LicenciaConstruccion;
    const { service } = createService({ registro, licenciaConstruccion: lc });

    await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.DescripcionProyecto': 'Actualizado',
      'LicenciaConstruccion.NombrePropietario': '',
      'LicenciaConstruccion.SuperficieTerrenoM2': '0',
    });

    expect(lc.descripcionProyecto).toBe('Actualizado');
    expect(lc.nombrePropietario).toBe('Juan');
    expect(lc.superficieTerrenoM2).toBe(0);
  });

  it('actualiza nuevos campos LC conservando Id y sin duplicar fila', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = {
      id: 8,
      idRegistro: 10,
      numeroExpediente: 'EXP-OLD',
      numeroControl: 'CTRL-OLD',
      seguimientoObra: 'Anterior',
      claveCatastral: 'CAT-ANTERIOR',
      constanciaAlineamiento: 1,
      licenciaUsoSuelo: 1,
      otros: 0,
    } as LicenciaConstruccion;
    const { service, manager } = createService({ registro, licenciaConstruccion: lc });

    await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.NumeroExpediente': 'EXP-2026-002',
      'LicenciaConstruccion.ClaveCatastral': '1100-01-002-003',
      'LicenciaConstruccion.ConstanciaAlineamiento': '0',
      'LicenciaConstruccion.Otros': '1',
    });

    expect(lc.id).toBe(8);
    expect(lc.numeroExpediente).toBe('EXP-2026-002');
    expect(lc.numeroControl).toBe('CTRL-OLD');
    expect(lc.seguimientoObra).toBe('Anterior');
    expect(lc.claveCatastral).toBe('1100-01-002-003');
    expect(lc.constanciaAlineamiento).toBe(0);
    expect(lc.otros).toBe(1);
    expect(manager.create).not.toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.anything(),
    );
  });

  it('no sobrescribe LC con NumeroControl, SeguimientoObra o ClaveCatastral vacíos', async () => {
    const registro = { id: 10, predioObra: 1, estatus: 4 } as Registros;
    const lc = {
      id: 8,
      idRegistro: 10,
      numeroExpediente: 'EXP-KEEP',
      numeroControl: 'CTRL-KEEP',
      seguimientoObra: 'Seguimiento activo',
      claveCatastral: 'CAT-KEEP',
      planoAutorizado: 1,
    } as LicenciaConstruccion;
    const { service } = createService({ registro, licenciaConstruccion: lc });

    await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.NumeroExpediente': 'EXP-KEEP',
      'LicenciaConstruccion.NumeroControl': '',
      'LicenciaConstruccion.SeguimientoObra': '   ',
      'LicenciaConstruccion.ClaveCatastral': '',
      'LicenciaConstruccion.PlanoAutorizado': null,
    });

    expect(lc.numeroControl).toBe('CTRL-KEEP');
    expect(lc.seguimientoObra).toBe('Seguimiento activo');
    expect(lc.claveCatastral).toBe('CAT-KEEP');
    expect(lc.planoAutorizado).toBe(1);
  });

  it('acepta PATCH solo con ClaveCatastral cuando PredioObra efectivo es 1', async () => {
    const registro = { id: 10, predioObra: 1, estatus: 4 } as Registros;
    const lc = {
      id: 8,
      idRegistro: 10,
      claveCatastral: null,
    } as LicenciaConstruccion;
    const { service } = createService({ registro, licenciaConstruccion: lc });

    const result = await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.ClaveCatastral': '1100-01-002-003',
    });

    expect(result.status).toBe('success');
    expect(lc.claveCatastral).toBe('1100-01-002-003');
  });

  it('ignora ClaveCatastral cuando PredioObra efectivo es 0', async () => {
    const registro = { id: 10, predioObra: 0, estatus: 4 } as Registros;
    const { service, manager } = createService({ registro });

    await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Solo calle',
      'LicenciaConstruccion.ClaveCatastral': 'NO-DEBE-GUARDARSE',
    });

    expect(manager.create).not.toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.anything(),
    );
  });

  it('cambio PredioObra 0→1 crea LC y no toca Sapac', async () => {
    const registro = {
      id: 10,
      predioObra: 0,
      estatus: 4,
    } as Registros;
    const { service, manager } = createService({
      registro,
      licenciaConstruccion: null,
      sapac: { id: 1, numeroCuenta: 'keep' } as Sapac,
    });

    await service.updateFromMultipart({
      idRegistro: '10',
      PredioObra: '1',
      'LicenciaConstruccion.TipoSolicitudLicencia': '2',
      'Sapac.NumeroCuenta': '999',
    });

    expect(registro.predioObra).toBe(1);
    expect(manager.create).toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(manager.create).not.toHaveBeenCalledWith(Sapac, expect.anything());
  });

  it('actualiza corresponsable con Id de la misma LC', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = { id: 8, idRegistro: 10 } as LicenciaConstruccion;
    const corr = {
      id: 5,
      idLicenciaConstruccion: 8,
      nombreCompleto: 'Viejo',
      cedulaProfesional: '111',
    } as Corresponsables;
    const { service } = createService({
      registro,
      licenciaConstruccion: lc,
      corresponsables: [corr],
    });

    const result = await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.Corresponsables[0].Id': '5',
      'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Nuevo',
      'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': '',
    });

    expect(corr.nombreCompleto).toBe('Nuevo');
    expect(corr.cedulaProfesional).toBe('111');
    expect(result.data).toEqual(
      expect.objectContaining({
        corresponsables: [
          expect.objectContaining({ id: 5, nombreCompleto: 'Nuevo' }),
        ],
      }),
    );
  });

  it('crea corresponsable sin Id', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = { id: 8, idRegistro: 10 } as LicenciaConstruccion;
    const { service, manager } = createService({
      registro,
      licenciaConstruccion: lc,
    });

    await service.updateFromMultipart({
      idRegistro: '10',
      'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Arq Nuevo',
      'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': '7654321',
    });

    expect(manager.create).toHaveBeenCalledWith(
      Corresponsables,
      expect.objectContaining({ idLicenciaConstruccion: 8 }),
    );
  });

  it('404 corresponsable inexistente', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = { id: 8, idRegistro: 10 } as LicenciaConstruccion;
    const { service } = createService({
      registro,
      licenciaConstruccion: lc,
      corresponsables: [],
    });

    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        'LicenciaConstruccion.Corresponsables[0].Id': '9999',
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'X',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400 corresponsable de otra licencia', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = { id: 8, idRegistro: 10 } as LicenciaConstruccion;
    const corr = {
      id: 5,
      idLicenciaConstruccion: 99,
      nombreCompleto: 'Ajeno',
    } as Corresponsables;
    const { service } = createService({
      registro,
      licenciaConstruccion: lc,
      corresponsables: [corr],
    });

    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        'LicenciaConstruccion.Corresponsables[0].Id': '5',
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Hack',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no crea corresponsable vacío', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const lc = { id: 8, idRegistro: 10 } as LicenciaConstruccion;
    const { service, manager } = createService({
      registro,
      licenciaConstruccion: lc,
    });

    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': '',
        'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(manager.create).not.toHaveBeenCalledWith(
      Corresponsables,
      expect.anything(),
    );
  });

  it('rollback si falla save en transacción LC', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, dataSource } = createService({
      registro,
      failOnSave: true,
    });

    await expect(
      service.updateFromMultipart({
        idRegistro: '10',
        'LicenciaConstruccion.DescripcionProyecto': 'X',
      }),
    ).rejects.toThrow('db fail');
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('no procesa LC cuando PredioObra almacenado es 0', async () => {
    const { service, manager } = createService();

    await service.updateFromMultipart({
      idRegistro: '10',
      Calle: 'Solo calle',
      'LicenciaConstruccion.DescripcionProyecto': 'No debe aplicar',
    });

    expect(manager.create).not.toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.anything(),
    );
  });

  it('guarda FirmaPropietario (IdTipoFoto 25) y crea LC si no existe', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, manager, storageService } = createService({
      registro,
      licenciaConstruccion: null,
    });

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [LC_FILE_FIELD_NAMES.FirmaPropietario]: [
          fakePng(LC_FILE_FIELD_NAMES.FirmaPropietario),
        ],
      },
    );

    expect(storageService.saveLcFiles).toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledWith(
      LicenciaConstruccion,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      FotosLicenciaConstruccion,
      expect.objectContaining({
        idTipoFoto: 25,
        ruta: 'https://cdn.example/registros/data/10/25/uuid.png',
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        fotosLicenciaConstruccion: [
          expect.objectContaining({
            idTipoFoto: 25,
            accion: 'creada',
          }),
        ],
      }),
    );
    expect(registro.estatus).toBe(4);
  });

  it('reemplaza solo Ruta cuando ya existe fila del mismo tipo (conserva Id)', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const existente = {
      id: 100,
      idLicenciaConstruccion: 20,
      idTipoFoto: 12,
      ruta: 'https://cdn.example/registros/data/10/12/plano-anterior.pdf',
      fechaHora: new Date('2020-01-01'),
    } as FotosLicenciaConstruccion;

    const { service, manager, storageService } = createService({
      registro,
      licenciaConstruccion: {
        id: 20,
        idRegistro: 10,
      } as LicenciaConstruccion,
    });

    (storageService.saveLcFiles as jest.Mock).mockResolvedValue({
      saved: [
        {
          key: 'PlanoAutorizado',
          idTipoFoto: 12,
          fileName: 'uuid-nuevo.pdf',
          absolutePath: '/tmp/10/12/uuid-nuevo.pdf',
          publicUrl:
            'https://cdn.example/registros/data/10/12/uuid-nuevo.pdf',
        },
      ],
      absoluteCreated: ['/tmp/10/12/uuid-nuevo.pdf'],
    });

    (manager.find as jest.Mock).mockImplementation(async (entity) => {
      if (entity === FotosLicenciaConstruccion) {
        return [existente];
      }
      return [];
    });

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [LC_FILE_FIELD_NAMES.PlanoAutorizado]: [
          fakePng(LC_FILE_FIELD_NAMES.PlanoAutorizado),
        ],
      },
    );

    expect(existente.id).toBe(100);
    expect(existente.ruta).toBe(
      'https://cdn.example/registros/data/10/12/uuid-nuevo.pdf',
    );
    expect(manager.create).not.toHaveBeenCalledWith(
      FotosLicenciaConstruccion,
      expect.anything(),
    );
    expect(storageService.cleanup).not.toHaveBeenCalled();
    expect(result.data).toEqual(
      expect.objectContaining({
        fotosLicenciaConstruccion: [
          expect.objectContaining({
            id: 100,
            idTipoFoto: 12,
            accion: 'actualizada',
          }),
        ],
      }),
    );
  });

  it('crea fila constanciaNumero (29) cuando no existe', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, manager, storageService } = createService({
      registro,
      licenciaConstruccion: {
        id: 20,
        idRegistro: 10,
      } as LicenciaConstruccion,
    });

    (storageService.saveLcFiles as jest.Mock).mockResolvedValue({
      saved: [
        {
          key: 'constanciaNumero',
          idTipoFoto: 29,
          fileName: 'uuid.pdf',
          absolutePath: '/tmp/10/29/uuid.pdf',
          publicUrl: 'https://cdn.example/registros/data/10/29/uuid.pdf',
        },
      ],
      absoluteCreated: ['/tmp/10/29/uuid.pdf'],
    });

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [LC_FILE_FIELD_NAMES.constanciaNumero]: [
          fakePng(LC_FILE_FIELD_NAMES.constanciaNumero),
        ],
      },
    );

    expect(manager.create).toHaveBeenCalledWith(
      FotosLicenciaConstruccion,
      expect.objectContaining({ idTipoFoto: 29 }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        fotosLicenciaConstruccion: [
          expect.objectContaining({
            idTipoFoto: 29,
            accion: 'creada',
          }),
        ],
      }),
    );
  });

  it('ignora archivos LC cuando PredioObra efectivo es 0', async () => {
    const { service, storageService } = createService();

    await service.updateFromMultipart(
      { idRegistro: '10', Calle: 'X' },
      {
        [LC_FILE_FIELD_NAMES.FirmaPropietario]: [
          fakePng(LC_FILE_FIELD_NAMES.FirmaPropietario),
        ],
      },
    );

    expect(storageService.saveLcFiles).not.toHaveBeenCalled();
  });

  it('no ejecuta cleanup físico si falla la BD tras guardar disco (PO=1)', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, storageService, manager } = createService({
      registro,
      licenciaConstruccion: { id: 8, idRegistro: 10 } as LicenciaConstruccion,
    });

    (manager.save as jest.Mock).mockImplementation(async (entity, data?) => {
      if (entity === FotosLicenciaConstruccion) {
        throw new Error('foto fail');
      }
      const row = data ?? entity;
      return { id: (row as { id?: number }).id ?? 8, ...row };
    });

    await expect(
      service.updateFromMultipart(
        { idRegistro: '10' },
        {
          [LC_FILE_FIELD_NAMES.FirmaPropietario]: [
            fakePng(LC_FILE_FIELD_NAMES.FirmaPropietario),
          ],
        },
      ),
    ).rejects.toThrow('foto fail');

    expect(storageService.cleanup).not.toHaveBeenCalled();
  });

  it('solicitud solo con archivo es válida (crea LC mínima)', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, storageService } = createService({
      registro,
      licenciaConstruccion: null,
    });

    await expect(
      service.updateFromMultipart(
        { idRegistro: '10' },
        {
          [LC_FILE_FIELD_NAMES.FirmaDRO]: [
            fakePng(LC_FILE_FIELD_NAMES.FirmaDRO),
          ],
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'success' }),
    );
    expect(storageService.saveLcFiles).toHaveBeenCalled();
  });

  it('con duplicados históricos actualiza solo la fila de Id mayor', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const vieja = {
      id: 50,
      idLicenciaConstruccion: 20,
      idTipoFoto: 12,
      ruta: 'old-1.pdf',
    } as FotosLicenciaConstruccion;
    const reciente = {
      id: 100,
      idLicenciaConstruccion: 20,
      idTipoFoto: 12,
      ruta: 'old-2.pdf',
    } as FotosLicenciaConstruccion;

    const { service, manager, storageService } = createService({
      registro,
      licenciaConstruccion: {
        id: 20,
        idRegistro: 10,
      } as LicenciaConstruccion,
    });

    (storageService.saveLcFiles as jest.Mock).mockResolvedValue({
      saved: [
        {
          key: 'PlanoAutorizado',
          idTipoFoto: 12,
          fileName: 'nuevo.pdf',
          absolutePath: '/tmp/10/12/nuevo.pdf',
          publicUrl: 'https://cdn.example/registros/data/10/12/nuevo.pdf',
        },
      ],
      absoluteCreated: ['/tmp/10/12/nuevo.pdf'],
    });

    (manager.find as jest.Mock).mockResolvedValue([reciente, vieja]);

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [LC_FILE_FIELD_NAMES.PlanoAutorizado]: [
          fakePng(LC_FILE_FIELD_NAMES.PlanoAutorizado),
        ],
      },
    );

    expect(reciente.ruta).toBe(
      'https://cdn.example/registros/data/10/12/nuevo.pdf',
    );
    expect(vieja.ruta).toBe('old-1.pdf');
    expect(result.data).toEqual(
      expect.objectContaining({
        fotosLicenciaConstruccion: [
          expect.objectContaining({ id: 100, accion: 'actualizada' }),
        ],
      }),
    );
  });

  it('crea Foto nueva (IdTipoFoto 3) y Sapac si solo se envía archivo', async () => {
    const { service, manager, sapacStorageService } = createService({
      sapac: null,
    });

    (manager.find as jest.Mock) = jest.fn().mockResolvedValue([]);

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fakePng(SAPAC_FILE_FIELD_NAMES.reciboSapac),
        ],
      },
    );

    expect(sapacStorageService.saveRegistroPhotos).toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledWith(
      Sapac,
      expect.objectContaining({ idRegistro: 10 }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      Fotos,
      expect.objectContaining({
        idTipoFoto: 3,
        ruta: 'https://cdn.example/registros/data/10/3/nuevo.jpg',
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        fotos: [
          expect.objectContaining({
            idTipoFoto: 3,
            accion: 'creada',
          }),
        ],
      }),
    );
  });

  it('actualiza Ruta de Foto existente sin crear duplicado ni cleanup', async () => {
    const fotoExistente = {
      id: 100,
      idRegistro: 10,
      idTipoFoto: 3,
      ruta: 'https://cdn.example/registros/data/10/3/anterior.jpg',
    } as Fotos;
    const { service, manager, sapacStorageService } = createService();

    (manager.find as jest.Mock) = jest
      .fn()
      .mockResolvedValue([fotoExistente]);

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fakePng(SAPAC_FILE_FIELD_NAMES.reciboSapac),
        ],
      },
    );

    expect(sapacStorageService.saveRegistroPhotos).toHaveBeenCalled();
    expect(sapacStorageService.cleanup).not.toHaveBeenCalled();
    expect(fotoExistente.ruta).toBe(
      'https://cdn.example/registros/data/10/3/nuevo.jpg',
    );
    expect(manager.create).not.toHaveBeenCalledWith(
      Fotos,
      expect.anything(),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        fotos: [
          expect.objectContaining({
            id: 100,
            idTipoFoto: 3,
            accion: 'actualizada',
          }),
        ],
      }),
    );
  });

  it('ignora Sapac.reciboSapac cuando PredioObra efectivo es 1', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, sapacStorageService } = createService({ registro });

    await expect(
      service.updateFromMultipart(
        { idRegistro: '10' },
        {
          [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
            fakePng(SAPAC_FILE_FIELD_NAMES.reciboSapac),
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sapacStorageService.saveRegistroPhotos).not.toHaveBeenCalled();
  });

  it('procesa Licencias.fachada con PredioObra = 1 sin crear Licencias ni tocar sus datos', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, manager, sapacStorageService } = createService({
      registro,
    });

    (sapacStorageService.saveRegistroPhotos as jest.Mock).mockResolvedValue({
      saved: [
        {
          key: 'Licencias.fachada',
          idTipoFoto: 6,
          fileName: 'fachada.jpg',
          absolutePath: '/tmp/10/6/fachada.jpg',
          publicUrl: 'https://cdn.example/registros/data/10/6/fachada.jpg',
        },
      ],
      absoluteCreated: ['/tmp/10/6/fachada.jpg'],
    });
    (manager.find as jest.Mock).mockResolvedValue([]);

    const result = await service.updateFromMultipart(
      {
        idRegistro: '10',
        'Licencias.NombreComercial': 'No debe aplicar',
      },
      {
        'Licencias.fachada': [fakePng('Licencias.fachada')],
      },
    );

    expect(sapacStorageService.saveRegistroPhotos).toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalledWith(
      Licencias,
      expect.anything(),
    );
    expect(manager.create).toHaveBeenCalledWith(
      Fotos,
      expect.objectContaining({
        idRegistro: 10,
        idTipoFoto: 6,
        ruta: 'https://cdn.example/registros/data/10/6/fachada.jpg',
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        idLicencia: null,
        fotos: [
          expect.objectContaining({ idTipoFoto: 6, accion: 'creada' }),
        ],
      }),
    );
  });

  it('actualiza Ruta de fachada existente con PredioObra = 1 (conserva Id)', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const fotoExistente = {
      id: 200,
      idRegistro: 10,
      idTipoFoto: 7,
      ruta: 'https://cdn.example/registros/data/10/7/anterior.jpg',
    } as Fotos;
    const { service, manager, sapacStorageService } = createService({
      registro,
    });

    (sapacStorageService.saveRegistroPhotos as jest.Mock).mockResolvedValue({
      saved: [
        {
          key: 'Licencias.estacionamiento',
          idTipoFoto: 7,
          fileName: 'nuevo.jpg',
          absolutePath: '/tmp/10/7/nuevo.jpg',
          publicUrl: 'https://cdn.example/registros/data/10/7/nuevo.jpg',
        },
      ],
      absoluteCreated: ['/tmp/10/7/nuevo.jpg'],
    });
    (manager.find as jest.Mock).mockImplementation(async (entity) => {
      if (entity === Fotos) return [fotoExistente];
      return [];
    });

    const result = await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        'Licencias.estacionamiento': [fakePng('Licencias.estacionamiento')],
      },
    );

    expect(fotoExistente.id).toBe(200);
    expect(fotoExistente.ruta).toBe(
      'https://cdn.example/registros/data/10/7/nuevo.jpg',
    );
    expect(manager.create).not.toHaveBeenCalledWith(Fotos, expect.anything());
    expect(sapacStorageService.cleanup).not.toHaveBeenCalled();
    expect(result.data).toEqual(
      expect.objectContaining({
        fotos: [
          expect.objectContaining({
            id: 200,
            idTipoFoto: 7,
            accion: 'actualizada',
          }),
        ],
      }),
    );
  });

  it('acepta solo archivos cuando PredioObra omitido y almacenado es 1', async () => {
    const registro = {
      id: 10,
      predioObra: 1,
      estatus: 4,
    } as Registros;
    const { service, storageService } = createService({
      registro,
      licenciaConstruccion: { id: 8, idRegistro: 10 } as LicenciaConstruccion,
    });

    await service.updateFromMultipart(
      { idRegistro: '10' },
      {
        [LC_FILE_FIELD_NAMES.FirmaDRO]: [
          fakePng(LC_FILE_FIELD_NAMES.FirmaDRO),
        ],
      },
    );

    expect(storageService.saveLcFiles).toHaveBeenCalled();
  });
});
