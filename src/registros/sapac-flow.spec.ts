import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CATASTRO_FILE_FIELD_NAMES } from './catastro.constants';
import {
  FIRMA_FIELD_NAMES,
  LC_DOCUMENTO_FIELD_NAMES,
  MAX_DOCUMENTOS_POR_TIPO,
} from './licencia-construccion.constants';
import { LicenciaConstruccionStorageService } from './licencia-construccion-storage.service';
import { hasCorresponsableData } from './licencia-construccion.sanitize';
import { parseRegistroMultipart } from './registro-form.parser';
import { LICENCIAS_FILE_FIELD_NAMES } from './licencias.constants';
import { PROTECCION_CIVIL_FILE_FIELD_NAMES } from './proteccion-civil.constants';
import { SAPAC_FILE_FIELD_NAMES } from './sapac.constants';
import { SapacStorageService } from './sapac-storage.service';

function baseBody(predioObra: 0 | 1): Record<string, unknown> {
  return {
    Latitud: '18.9530959',
    Longitud: '-99.2353385',
    TipoRegistro: '1',
    PredioObra: String(predioObra),
  };
}

function file(
  fieldname: string,
  originalname = 'documento.jpg',
  mimetype = 'image/jpeg',
  buffer = Buffer.from('contenido'),
): Express.Multer.File {
  return {
    fieldname,
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  };
}

describe('Flujo SAPAC de registros', () => {
  it('crea el modelo SAPAC vacío cuando PredioObra es 0', async () => {
    const parsed = await parseRegistroMultipart(baseBody(0), {});

    expect(parsed.crearSapac).toBe(true);
    expect(parsed.crearCatastro).toBe(true);
    expect(parsed.crearLicencia).toBe(true);
    expect(parsed.crearLicenciaConstruccion).toBe(false);
    expect(parsed.sapac).toBeDefined();
    expect(parsed.catastro).toBeDefined();
    expect(parsed.licencia).toBeDefined();
    expect(parsed.fotosSapac).toEqual({});
    expect(parsed.fotosCatastro).toEqual({});
    expect(parsed.fotosLicencias).toEqual({});
  });

  it('convierte enteros y no convierte cadenas vacías a cero', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Sapac.Sector': '12',
        'Sapac.Ruta': '  ',
        'Sapac.IdTipoServicio': '2',
      },
      {},
    );

    expect(parsed.sapac?.Sector).toBe(12);
    expect(parsed.sapac?.Ruta).toBeUndefined();
    expect(parsed.sapac?.IdTipoServicio).toBe(2);
  });

  it('acepta IdTipoServicio 1 y 2; rechaza valores inválidos', async () => {
    const ok1 = await parseRegistroMultipart(
      { ...baseBody(0), 'Sapac.IdTipoServicio': '1' },
      {},
    );
    expect(ok1.sapac?.IdTipoServicio).toBe(1);

    const ok2 = await parseRegistroMultipart(
      { ...baseBody(0), 'Sapac.IdTipoServicio': 2 },
      {},
    );
    expect(ok2.sapac?.IdTipoServicio).toBe(2);

    for (const invalid of ['0', '3', '-1', '1.5', 'true', 'false', 'agua']) {
      await expect(
        parseRegistroMultipart(
          { ...baseBody(0), 'Sapac.IdTipoServicio': invalid },
          {},
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('trata IdTipoServicio vacío como no enviado', async () => {
    const parsed = await parseRegistroMultipart(
      { ...baseBody(0), 'Sapac.IdTipoServicio': '  ' },
      {},
    );
    expect(parsed.sapac?.IdTipoServicio).toBeUndefined();
  });

  it('ignora campos SAPAC cuando PredioObra es 1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'Sapac.Nombre': '',
        'Sapac.Sector': '',
      },
      {},
    );

    expect(parsed.crearSapac).toBe(false);
    expect(parsed.sapac).toBeUndefined();
  });

  it('ignora un archivo SAPAC cuando PredioObra es 1', async () => {
    const field = SAPAC_FILE_FIELD_NAMES.reciboSapac;
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [field]: [file(field)],
    });
    expect(parsed.fotosSapac).toEqual({});
  });

  it('mapea los tres archivos a sus claves SAPAC', async () => {
    const uploaded = Object.fromEntries(
      Object.values(SAPAC_FILE_FIELD_NAMES).map((field) => [
        field,
        [file(field)],
      ]),
    );

    const parsed = await parseRegistroMultipart(baseBody(0), uploaded);
    expect(Object.keys(parsed.fotosSapac).sort()).toEqual(
      ['reciboSapac', 'caratulamedidor', 'cuadromedidor'].sort(),
    );
  });
});

describe('Flujo Catastro de registros', () => {
  it('crea Catastro vacío cuando PredioObra es 0', async () => {
    const parsed = await parseRegistroMultipart(baseBody(0), {});
    expect(parsed.crearCatastro).toBe(true);
    expect(parsed.catastro).toBeDefined();
    expect(parsed.fotosCatastro).toEqual({});
  });

  it('procesa campos Catastro y conserva Clave como texto', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Catastro.Clave': '001234',
        'Catastro.M2': '80',
        'Catastro.Superficie': '  ',
        'Catastro.UsoSuelo': 'Habitacional',
      },
      {},
    );

    expect(parsed.catastro?.Clave).toBe('001234');
    expect(typeof parsed.catastro?.Clave).toBe('string');
    expect(parsed.catastro?.M2).toBe('80');
    expect(parsed.catastro?.Superficie).toBeUndefined();
    expect(parsed.catastro?.UsoSuelo).toBe('Habitacional');
  });

  it('acepta Clave con guiones y alfanuméricos', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Catastro.Clave': '1100-01-002-003',
      },
      {},
    );
    expect(parsed.catastro?.Clave).toBe('1100-01-002-003');

    const parsed2 = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Catastro.Clave': 'CUER-2026-001',
      },
      {},
    );
    expect(parsed2.catastro?.Clave).toBe('CUER-2026-001');
  });

  it('rechaza Clave mayor a 200 caracteres', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Catastro.Clave': 'A'.repeat(201),
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convierte Clave vacía a undefined', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Catastro.Clave': '   ',
      },
      {},
    );
    expect(parsed.catastro?.Clave).toBeUndefined();
  });

  it('rechaza Superficie negativa', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Catastro.Superficie': '-1',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora campos Catastro vacíos cuando PredioObra es 1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'Catastro.Clave': '',
        'Catastro.Superficie': '',
      },
      {},
    );

    expect(parsed.crearCatastro).toBe(false);
    expect(parsed.catastro).toBeUndefined();
  });

  it('ignora reciboPredial cuando PredioObra es 1', async () => {
    const field = CATASTRO_FILE_FIELD_NAMES.reciboPredial;
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [field]: [file(field)],
    });
    expect(parsed.fotosCatastro).toEqual({});
  });

  it('mapea reciboPredial a fotosCatastro', async () => {
    const field = CATASTRO_FILE_FIELD_NAMES.reciboPredial;
    const parsed = await parseRegistroMultipart(baseBody(0), {
      [field]: [file(field)],
    });

    expect(parsed.fotosCatastro.reciboPredial).toBeDefined();
  });

  it('rechaza IdRegistro enviado por el cliente', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Catastro.IdRegistro': '999',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "Catastro.IdRegistro" no puede enviarse desde el cliente',
      ),
    );
  });
});

describe('Flujo Licencias de registros', () => {
  it('crea Licencias vacío cuando PredioObra es 0', async () => {
    const parsed = await parseRegistroMultipart(baseBody(0), {});
    expect(parsed.crearLicencia).toBe(true);
    expect(parsed.licencia).toBeDefined();
    expect(parsed.contacto).toBeUndefined();
    expect(parsed.fotosLicencias).toEqual({});
  });

  it('acepta Estacionamiento 0 y 1; rechaza 2', async () => {
    const ok0 = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.Estacionamiento': '0' },
      {},
    );
    expect(ok0.licencia?.Estacionamiento).toBe(0);

    const ok1 = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.Estacionamiento': '1' },
      {},
    );
    expect(ok1.licencia?.Estacionamiento).toBe(1);

    await expect(
      parseRegistroMultipart(
        { ...baseBody(0), 'Licencias.Estacionamiento': '2' },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no convierte Estacionamiento vacío a cero', async () => {
    const parsed = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.Estacionamiento': '  ' },
      {},
    );
    expect(parsed.licencia?.Estacionamiento).toBeUndefined();
  });

  it('parsea Contacto como objeto 1:1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Licencias.NombreComercial': 'Papelería',
        'Licencias.Contacto.Nombre': 'Juan',
        'Licencias.Contacto.ApellidoPaterno': 'Pérez',
        'Licencias.Contacto.Correo': 'juan@ejemplo.com',
      },
      {},
    );

    expect(parsed.licencia?.NombreComercial).toBe('Papelería');
    expect(parsed.contacto).toEqual(
      expect.objectContaining({
        Nombre: 'Juan',
        ApellidoPaterno: 'Pérez',
        Correo: 'juan@ejemplo.com',
      }),
    );
    expect(Array.isArray(parsed.contacto)).toBe(false);
  });

  it('ignora Licencias y Contacto cuando PredioObra es 1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'Licencias.NombreComercial': '',
        'Licencias.Contacto.Nombre': '',
      },
      {},
    );

    expect(parsed.crearLicencia).toBe(false);
    expect(parsed.licencia).toBeUndefined();
    expect(parsed.contacto).toBeUndefined();
  });

  it('ignora archivos Licencias cuando PredioObra es 1', async () => {
    const field = LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento;
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [field]: [file(field)],
    });
    expect(parsed.fotosLicencias).toEqual({});
  });

  it('mapea las cuatro fotografías de Licencias', async () => {
    const uploaded = Object.fromEntries(
      Object.values(LICENCIAS_FILE_FIELD_NAMES).map((field) => [
        field,
        [file(field)],
      ]),
    );
    const parsed = await parseRegistroMultipart(baseBody(0), uploaded);
    expect(Object.keys(parsed.fotosLicencias).sort()).toEqual(
      [
        'licenciaFuncionamiento',
        'bodega',
        'fachada',
        'estacionamiento',
      ].sort(),
    );
  });

  it('rechaza IdRegistro de Licencias enviado por el cliente', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Licencias.IdRegistro': '999',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "Licencias.IdRegistro" no puede enviarse desde el cliente',
      ),
    );
  });

  it('no acepta RazonSocial ni Estatus (columnas eliminadas)', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Licencias.RazonSocial': 'Acme SA',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "Licencias.RazonSocial" no puede enviarse desde el cliente',
      ),
    );

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'Licencias.Estatus': '0',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "Licencias.Estatus" no puede enviarse desde el cliente',
      ),
    );
  });

  it('guarda TipoPersona y Tipo como enteros opcionales', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'Licencias.TipoPersona': '1',
        'Licencias.Tipo': '2',
      },
      {},
    );
    expect(parsed.licencia?.TipoPersona).toBe(1);
    expect(parsed.licencia?.Tipo).toBe(2);
  });

  it('acepta TipoPersona 1 y 2; rechaza valores inválidos', async () => {
    const ok1 = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.TipoPersona': '1' },
      {},
    );
    expect(ok1.licencia?.TipoPersona).toBe(1);

    const ok2 = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.TipoPersona': 2 },
      {},
    );
    expect(ok2.licencia?.TipoPersona).toBe(2);

    for (const invalid of [
      '0',
      '3',
      '-1',
      '1.5',
      'true',
      'false',
      'fisica',
      'moral',
      'texto',
    ]) {
      await expect(
        parseRegistroMultipart(
          { ...baseBody(0), 'Licencias.TipoPersona': invalid },
          {},
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('trata TipoPersona vacío como no enviado', async () => {
    const parsed = await parseRegistroMultipart(
      { ...baseBody(0), 'Licencias.TipoPersona': '  ' },
      {},
    );
    expect(parsed.licencia?.TipoPersona).toBeUndefined();
  });
});

describe('Flujo ProteccionCivil de registros', () => {
  it('crea ProteccionCivil vacío cuando PredioObra es 0', async () => {
    const parsed = await parseRegistroMultipart(baseBody(0), {});
    expect(parsed.crearProteccionCivil).toBe(true);
    expect(parsed.proteccionCivil).toBeDefined();
    expect(parsed.contactoRepresentante).toBeUndefined();
    expect(parsed.fotosProteccionCivil).toEqual({});
  });

  it('acepta EsEmpresa y TienePrograma en 0/1, y no convierte vacíos a cero', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'ProteccionCivil.EsEmpresa': '0',
        'ProteccionCivil.TienePrograma': '1',
        'ProteccionCivil.RazonSocial': '  ',
      },
      {},
    );

    expect(parsed.proteccionCivil?.EsEmpresa).toBe(0);
    expect(parsed.proteccionCivil?.TienePrograma).toBe(1);
    expect(parsed.proteccionCivil?.RazonSocial).toBeUndefined();
  });

  it('rechaza EsEmpresa=2 y TienePrograma=2', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'ProteccionCivil.EsEmpresa': '2',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'ProteccionCivil.TienePrograma': '2',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parsea ContactoRepresentante como objeto 1:1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'ProteccionCivil.ContactoRepresentante.Nombre': 'Juan',
        'ProteccionCivil.ContactoRepresentante.Correo': 'juan@ejemplo.com',
      },
      {},
    );

    expect(parsed.contactoRepresentante).toEqual(
      expect.objectContaining({
        Nombre: 'Juan',
        Correo: 'juan@ejemplo.com',
      }),
    );
    expect(Array.isArray(parsed.contactoRepresentante)).toBe(false);
  });

  it('ignora ProteccionCivil y ContactoRepresentante cuando PredioObra es 1', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'ProteccionCivil.RazonSocial': 'Empresa',
        'ProteccionCivil.ContactoRepresentante.Nombre': 'Juan',
      },
      {},
    );

    expect(parsed.crearProteccionCivil).toBe(false);
    expect(parsed.proteccionCivil).toBeUndefined();
    expect(parsed.contactoRepresentante).toBeUndefined();
  });

  it('ignora vistoBueno cuando PredioObra es 1', async () => {
    const field = PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno;
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [field]: [file(field)],
    });

    expect(parsed.fotosProteccionCivil).toEqual({});
  });

  it('mapea vistoBueno a fotosProteccionCivil', async () => {
    const field = PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno;
    const parsed = await parseRegistroMultipart(baseBody(0), {
      [field]: [file(field)],
    });

    expect(parsed.fotosProteccionCivil.vistoBueno).toBeDefined();
  });

  it('rechaza IdRegistro enviado por el cliente en ProteccionCivil y ContactoRepresentante', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'ProteccionCivil.IdRegistro': '999',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "ProteccionCivil.IdRegistro" no puede enviarse desde el cliente',
      ),
    );

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(0),
          'ProteccionCivil.ContactoRepresentante.IdRegistro': '999',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "ProteccionCivil.ContactoRepresentante.IdRegistro" no puede enviarse desde el cliente',
      ),
    );
  });

  it('rechaza más de un archivo para vistoBueno', async () => {
    const field = PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno;

    await expect(
      parseRegistroMultipart(baseBody(0), {
        [field]: [file(field, 'uno.jpg'), file(field, 'dos.jpg')],
      }),
    ).rejects.toThrow(
      new BadRequestException(`Solo se permite un archivo para "${field}"`),
    );
  });
});

describe('SapacStorageService / FotosRegistros', () => {
  let basePath: string;
  let service: SapacStorageService;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'fotos-registros-'));
    const config = {
      get: jest.fn((key: string) =>
        key === 'FOTOS_REGISTROS_STORAGE_PATH' ? basePath : undefined,
      ),
    } as unknown as ConfigService;
    service = new SapacStorageService(config);
    service.onModuleInit();
  });

  afterEach(async () => {
    await fs.rm(basePath, { recursive: true, force: true });
  });

  it('guarda ruta absoluta con IdRegistro e IdTipoFoto y permite cleanup', async () => {
    const { saved, absoluteCreated } = await service.saveFiles(10, {
      reciboSapac: file(SAPAC_FILE_FIELD_NAMES.reciboSapac),
    });

    expect(saved).toHaveLength(1);
    expect(saved[0].idTipoFoto).toBe(3);
    expect(path.isAbsolute(saved[0].absolutePath)).toBe(true);
    expect(saved[0].absolutePath.startsWith(path.resolve(basePath))).toBe(true);
    expect(saved[0].absolutePath).toContain(path.join('10', '3') + path.sep);
    await expect(fs.access(saved[0].absolutePath)).resolves.toBeUndefined();
    expect(absoluteCreated[0]).toBe(saved[0].absolutePath);

    await service.cleanup(absoluteCreated);
    await expect(fs.access(saved[0].absolutePath)).rejects.toBeDefined();
  });

  it('guarda reciboPredial con IdTipoFoto=2', async () => {
    const { saved, absoluteCreated } = await service.saveRegistroPhotos(15, [
      {
        key: 'reciboPredial',
        file: file(CATASTRO_FILE_FIELD_NAMES.reciboPredial),
        idTipoFoto: 2,
      },
    ]);

    expect(saved).toHaveLength(1);
    expect(saved[0].idTipoFoto).toBe(2);
    expect(saved[0].absolutePath).toContain(path.join('15', '2') + path.sep);
    expect(absoluteCreated[0]).toBe(saved[0].absolutePath);
    await expect(fs.access(saved[0].absolutePath)).resolves.toBeUndefined();
  });

  it('guarda licenciaFuncionamiento con IdTipoFoto=1', async () => {
    const { saved } = await service.saveRegistroPhotos(25, [
      {
        key: 'licenciaFuncionamiento',
        file: file(LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento),
        idTipoFoto: 1,
      },
    ]);
    expect(saved[0].idTipoFoto).toBe(1);
    expect(saved[0].absolutePath).toContain(path.join('25', '1') + path.sep);
  });

  it('guarda vistoBueno con IdTipoFoto=9', async () => {
    const { saved } = await service.saveRegistroPhotos(30, [
      {
        key: 'vistoBueno',
        file: file(
          PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno,
          'visto-bueno.pdf',
          'application/pdf',
        ),
        idTipoFoto: 9,
      },
    ]);

    expect(saved[0].idTipoFoto).toBe(9);
    expect(saved[0].absolutePath).toContain(path.join('30', '9') + path.sep);
    expect(saved[0].absolutePath.endsWith('.pdf')).toBe(true);
  });

  it('rechaza archivos vacíos', async () => {
    await expect(
      service.saveFiles(10, {
        reciboSapac: file(
          SAPAC_FILE_FIELD_NAMES.reciboSapac,
          'vacio.jpg',
          'image/jpeg',
          Buffer.alloc(0),
        ),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Flujo Corresponsables de LicenciaConstruccion', () => {
  it('parsea un corresponsable indexado', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto':
          'Arquitecto Juan Pérez',
        'LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion':
          'COR-001',
        'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': '12345678',
      },
      {},
    );

    expect(parsed.crearLicenciaConstruccion).toBe(true);
    expect(parsed.licenciaConstruccion?.Corresponsables).toHaveLength(1);
    expect(parsed.licenciaConstruccion?.Corresponsables?.[0]).toEqual(
      expect.objectContaining({
        NombreCompleto: 'Arquitecto Juan Pérez',
        NoRegLicenciaConstruccion: 'COR-001',
        CedulaProfesional: '12345678',
      }),
    );
  });

  it('parsea varios corresponsables y mantiene el orden de índices', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'LicenciaConstruccion.Corresponsables[1].NombreCompleto':
          'Ingeniera María López',
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto':
          'Arquitecto Juan Pérez',
        'LicenciaConstruccion.Corresponsables[2].CedulaProfesional': '999',
      },
      {},
    );

    expect(parsed.licenciaConstruccion?.Corresponsables).toHaveLength(3);
    expect(
      parsed.licenciaConstruccion?.Corresponsables?.map((c) => c.NombreCompleto),
    ).toEqual(['Arquitecto Juan Pérez', 'Ingeniera María López', undefined]);
    expect(
      parsed.licenciaConstruccion?.Corresponsables?.[2].CedulaProfesional,
    ).toBe('999');
  });

  it('soporta índices no consecutivos', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Uno',
        'LicenciaConstruccion.Corresponsables[5].NombreCompleto': 'Seis',
      },
      {},
    );

    expect(parsed.licenciaConstruccion?.Corresponsables).toHaveLength(2);
    expect(
      parsed.licenciaConstruccion?.Corresponsables?.map((c) => c.NombreCompleto),
    ).toEqual(['Uno', 'Seis']);
  });

  it('ignora corresponsables vacíos en sanitización y no los incluye', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(1),
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': '',
        'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': '   ',
        'LicenciaConstruccion.Corresponsables[1].NombreCompleto': 'Válido',
      },
      {},
    );

    expect(parsed.licenciaConstruccion?.Corresponsables).toHaveLength(1);
    expect(parsed.licenciaConstruccion?.Corresponsables?.[0].NombreCompleto).toBe(
      'Válido',
    );
  });

  it('valida longitudes máximas de corresponsables', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(1),
          'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'A'.repeat(
            192,
          ),
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(1),
          'LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion':
            'B'.repeat(51),
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(1),
          'LicenciaConstruccion.Corresponsables[0].CedulaProfesional':
            'C'.repeat(31),
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite Id ni IdLicenciaConstruccion en corresponsables', async () => {
    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(1),
          'LicenciaConstruccion.Corresponsables[0].Id': '1',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "LicenciaConstruccion.Corresponsables[0].Id" no puede enviarse desde el cliente',
      ),
    );

    await expect(
      parseRegistroMultipart(
        {
          ...baseBody(1),
          'LicenciaConstruccion.Corresponsables[0].IdLicenciaConstruccion':
            '99',
        },
        {},
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'El campo "LicenciaConstruccion.Corresponsables[0].IdLicenciaConstruccion" no puede enviarse desde el cliente',
      ),
    );
  });

  it('ignora corresponsables cuando PredioObra es 0', async () => {
    const parsed = await parseRegistroMultipart(
      {
        ...baseBody(0),
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': 'Juan',
      },
      {},
    );

    expect(parsed.crearLicenciaConstruccion).toBe(false);
    expect(parsed.licenciaConstruccion).toBeUndefined();
  });

  it('hasCorresponsableData detecta elementos vacíos y válidos', () => {
    expect(hasCorresponsableData(undefined)).toBe(false);
    expect(
      hasCorresponsableData({
        NombreCompleto: '',
        CedulaProfesional: '   ',
      }),
    ).toBe(false);
    expect(
      hasCorresponsableData({
        NombreCompleto: 'Juan',
      }),
    ).toBe(true);
  });
});

describe('Documentos múltiples de LicenciaConstruccion', () => {
  it('mapea varios archivos del mismo atributo', async () => {
    const field = LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero;
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [field]: [
        file(field, 'a.pdf', 'application/pdf'),
        file(field, 'b.jpg', 'image/jpeg'),
        file(field, 'c.png', 'image/png'),
      ],
    });

    expect(parsed.documentosLc.constanciaAlineamientoyNumero).toHaveLength(3);
  });

  it('mapea archivos de varios atributos con sus claves', async () => {
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [LC_DOCUMENTO_FIELD_NAMES.Factibilidad]: [
        file(LC_DOCUMENTO_FIELD_NAMES.Factibilidad),
      ],
      [LC_DOCUMENTO_FIELD_NAMES.otros]: [
        file(LC_DOCUMENTO_FIELD_NAMES.otros, 'x.pdf', 'application/pdf'),
        file(LC_DOCUMENTO_FIELD_NAMES.otros, 'y.jpg', 'image/jpeg'),
      ],
    });

    expect(parsed.documentosLc.Factibilidad).toHaveLength(1);
    expect(parsed.documentosLc.otros).toHaveLength(2);
  });

  it('rechaza más documentos que el máximo permitido', async () => {
    const field = LC_DOCUMENTO_FIELD_NAMES.Factibilidad;
    const files = Array.from({ length: MAX_DOCUMENTOS_POR_TIPO + 1 }, (_, i) =>
      file(field, `doc-${i}.pdf`, 'application/pdf'),
    );

    await expect(
      parseRegistroMultipart(baseBody(1), { [field]: files }),
    ).rejects.toThrow(
      new BadRequestException(
        `El campo ${field} excede el máximo permitido de documentos.`,
      ),
    );
  });

  it('ignora documentos múltiples cuando PredioObra es 0', async () => {
    const field = LC_DOCUMENTO_FIELD_NAMES.ConstanciaPropietario;
    const parsed = await parseRegistroMultipart(baseBody(0), {
      [field]: [file(field)],
    });

    expect(parsed.documentosLc).toEqual({});
    expect(parsed.crearLicenciaConstruccion).toBe(false);
  });

  it('mantiene firmas individuales junto con documentos', async () => {
    const parsed = await parseRegistroMultipart(baseBody(1), {
      [FIRMA_FIELD_NAMES.FirmaPropietario]: [
        file(FIRMA_FIELD_NAMES.FirmaPropietario),
      ],
      [LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano]: [
        file(LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano),
        file(LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano, 'plano-2.pdf', 'application/pdf'),
      ],
    });

    expect(parsed.firmas.FirmaPropietario).toBeDefined();
    expect(parsed.documentosLc.LicenciaUsoyPlano).toHaveLength(2);
  });
});

describe('LicenciaConstruccionStorageService / documentos múltiples', () => {
  let basePath: string;
  let service: LicenciaConstruccionStorageService;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'fotos-lc-docs-'));
    const config = {
      get: jest.fn((key: string) =>
        key === 'LICENCIA_CONSTRUCCION_STORAGE_PATH' ? basePath : undefined,
      ),
    } as unknown as ConfigService;
    service = new LicenciaConstruccionStorageService(config);
    service.onModuleInit();
  });

  afterEach(async () => {
    await fs.rm(basePath, { recursive: true, force: true });
  });

  it('guarda varios archivos del mismo tipo con UUID distintos', async () => {
    const { saved, absoluteCreated } = await service.saveDocumentoArrays(40, {
      constanciaAlineamientoyNumero: [
        file(
          LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero,
          'a.pdf',
          'application/pdf',
        ),
        file(
          LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero,
          'b.jpg',
          'image/jpeg',
        ),
      ],
    });

    expect(saved).toHaveLength(2);
    expect(saved.every((item) => item.idTipoFoto === 10)).toBe(true);
    expect(saved[0].absolutePath).not.toBe(saved[1].absolutePath);
    expect(saved[0].absolutePath).toContain(path.join('40', '10') + path.sep);
    expect(path.isAbsolute(saved[0].absolutePath)).toBe(true);
    await expect(fs.access(saved[0].absolutePath)).resolves.toBeUndefined();
    expect(absoluteCreated).toHaveLength(2);
  });

  it('asigna IdTipoFoto correcto por atributo', async () => {
    const { saved } = await service.saveDocumentoArrays(41, {
      LicenciaUsoyPlano: [
        file(LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano),
      ],
      ConstanciaPropietario: [
        file(LC_DOCUMENTO_FIELD_NAMES.ConstanciaPropietario),
      ],
      Factibilidad: [file(LC_DOCUMENTO_FIELD_NAMES.Factibilidad)],
      RecibosImpuestoPredial: [
        file(LC_DOCUMENTO_FIELD_NAMES.RecibosImpuestoPredial),
      ],
      JuegoDePlanosArquitectonicos: [
        file(LC_DOCUMENTO_FIELD_NAMES.JuegoDePlanosArquitectonicos),
      ],
      otros: [file(LC_DOCUMENTO_FIELD_NAMES.otros)],
    });

    const tipos = saved.map((item) => item.idTipoFoto).sort((a, b) => a - b);
    expect(tipos).toEqual([11, 14, 15, 16, 17, 18]);
  });

  it('rechaza archivo vacío en arreglo de documentos', async () => {
    await expect(
      service.saveDocumentoArrays(42, {
        otros: [
          file(
            LC_DOCUMENTO_FIELD_NAMES.otros,
            'vacio.pdf',
            'application/pdf',
            Buffer.alloc(0),
          ),
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('limpia archivos si falla un documento posterior', async () => {
    await expect(
      service.saveDocumentoArrays(43, {
        Factibilidad: [
          file(LC_DOCUMENTO_FIELD_NAMES.Factibilidad, 'ok.pdf', 'application/pdf'),
          file(
            LC_DOCUMENTO_FIELD_NAMES.Factibilidad,
            'malo.exe',
            'application/octet-stream',
          ),
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const entries = await fs.readdir(basePath).catch(() => [] as string[]);
    expect(entries).toEqual([]);
  });
});
