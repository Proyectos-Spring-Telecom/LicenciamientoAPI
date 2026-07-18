import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  LC_FILE_FIELD_NAMES,
  LC_FILE_KEYS,
  LC_FILE_TIPO_FOTO,
  LICENCIA_CONSTRUCCION_FILE_TYPE_MAP,
  LcFileKey,
} from './licencia-construccion.constants';
import { sanitizeMultipartFiles } from './licencia-construccion.sanitize';
import { parseRegistroMultipart } from './registro-form.parser';

function multerFile(fieldname: string): Express.Multer.File {
  return {
    fieldname,
    originalname: 'archivo.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('contenido'),
    size: 9,
  } as Express.Multer.File;
}

const BODY_BASE = {
  Latitud: '18.95',
  Longitud: '-99.23',
  TipoRegistro: '0',
};

const EXPECTED_MAP: Record<LcFileKey, number> = {
  constanciaAlineamiento: 10,
  constanciaNumero: 29,
  LicenciaUsoSuelo: 11,
  PlanoAutorizado: 12,
  LicenciaFraccionamiento: 13,
  ConstanciaPropietario: 14,
  Factibilidad: 15,
  RecibosImpuestoPredial: 16,
  JuegoDePlanosArquitectonicos1: 17,
  JuegoDePlanosArquitectonicos2: 31,
  JuegoDePlanosArquitectonicos3: 32,
  otros: 18,
  FirmaPropietario: 25,
  FirmaDRO: 26,
  FirmaCorresponsable: 27,
  FirmaResponsableRecepcionDocumento: 28,
};

describe('archivos individuales de LicenciaConstruccion (POST /registros)', () => {
  it('el mapa central contiene exactamente los 16 campos con su IdTipoFoto', () => {
    expect(LC_FILE_KEYS).toHaveLength(16);
    for (const [key, idTipoFoto] of Object.entries(EXPECTED_MAP)) {
      expect(LC_FILE_TIPO_FOTO[key as LcFileKey]).toBe(idTipoFoto);
      expect(
        LICENCIA_CONSTRUCCION_FILE_TYPE_MAP[`LicenciaConstruccion.${key}`],
      ).toBe(idTipoFoto);
      expect(LC_FILE_FIELD_NAMES[key as LcFileKey]).toBe(
        `LicenciaConstruccion.${key}`,
      );
    }
  });

  it.each(LC_FILE_KEYS)(
    'con PredioObra = 1 acepta %s y lo asigna a archivosLc',
    async (key) => {
      const fieldName = LC_FILE_FIELD_NAMES[key];
      const parsed = await parseRegistroMultipart(
        { ...BODY_BASE, PredioObra: '1' },
        { [fieldName]: [multerFile(fieldName)] },
      );

      expect(parsed.archivosLc[key]).toBeDefined();
      expect(
        Object.keys(parsed.archivosLc).filter(
          (item) => parsed.archivosLc[item as LcFileKey],
        ),
      ).toEqual([key]);
    },
  );

  it('los tres planos usan claves y tipos distintos (17, 31, 32)', async () => {
    const parsed = await parseRegistroMultipart(
      { ...BODY_BASE, PredioObra: '1' },
      {
        [LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos1]: [
          multerFile(LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos1),
        ],
        [LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos2]: [
          multerFile(LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos2),
        ],
        [LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos3]: [
          multerFile(LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos3),
        ],
      },
    );

    expect(parsed.archivosLc.JuegoDePlanosArquitectonicos1).toBeDefined();
    expect(parsed.archivosLc.JuegoDePlanosArquitectonicos2).toBeDefined();
    expect(parsed.archivosLc.JuegoDePlanosArquitectonicos3).toBeDefined();
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos1).toBe(17);
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos2).toBe(31);
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos3).toBe(32);
  });

  it.each([
    'LicenciaConstruccion.constanciaAlineamientoyNumero',
    'LicenciaConstruccion.LicenciaUsoyPlano',
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos',
  ])('rechaza el campo de archivo antiguo %s', async (oldField) => {
    await expect(
      parseRegistroMultipart(
        { ...BODY_BASE, PredioObra: '1' },
        { [oldField]: [multerFile(oldField)] },
      ),
    ).rejects.toThrow(`Campo de archivo no reconocido: "${oldField}"`);
  });

  it.each([
    LC_FILE_FIELD_NAMES.RecibosImpuestoPredial,
    LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos1,
  ])('rechaza dos archivos en el mismo campo %s', async (fieldName) => {
    await expect(
      parseRegistroMultipart(
        { ...BODY_BASE, PredioObra: '1' },
        { [fieldName]: [multerFile(fieldName), multerFile(fieldName)] },
      ),
    ).rejects.toThrow(`Solo se permite un archivo para "${fieldName}"`);
  });

  it('con PredioObra = 0 descarta los archivos LC (sanitizador actual)', async () => {
    const fieldName = LC_FILE_FIELD_NAMES.constanciaNumero;
    const parsed = await parseRegistroMultipart(
      { ...BODY_BASE, PredioObra: '0' },
      { [fieldName]: [multerFile(fieldName)] },
    );

    expect(parsed.crearLicenciaConstruccion).toBe(false);
    expect(Object.keys(parsed.archivosLc)).toHaveLength(0);
  });

  it('sanitizeMultipartFiles elimina los nuevos campos LC con PredioObra = 0', () => {
    const result = sanitizeMultipartFiles(
      {
        [LC_FILE_FIELD_NAMES.constanciaNumero]: [
          multerFile(LC_FILE_FIELD_NAMES.constanciaNumero),
        ],
        [LC_FILE_FIELD_NAMES.FirmaPropietario]: [
          multerFile(LC_FILE_FIELD_NAMES.FirmaPropietario),
        ],
      },
      0,
    );
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('distingue el indicador tinyint (body) del archivo (files) con el mismo nombre', async () => {
    const fieldName = LC_FILE_FIELD_NAMES.LicenciaUsoSuelo;
    const parsed = await parseRegistroMultipart(
      {
        ...BODY_BASE,
        PredioObra: '1',
        [fieldName]: '0',
        'LicenciaConstruccion.PlanoAutorizado': '1',
      },
      { [fieldName]: [multerFile(fieldName)] },
    );

    expect(parsed.licenciaConstruccion?.LicenciaUsoSuelo).toBe(0);
    expect(parsed.licenciaConstruccion?.PlanoAutorizado).toBe(1);
    expect(parsed.archivosLc.LicenciaUsoSuelo).toBeDefined();
    expect(parsed.archivosLc.PlanoAutorizado).toBeUndefined();
  });

  it('mantiene los transversales de Licencias con PredioObra = 1 junto a archivos LC', async () => {
    const parsed = await parseRegistroMultipart(
      { ...BODY_BASE, PredioObra: '1' },
      {
        'Licencias.fachada': [multerFile('Licencias.fachada')],
        [LC_FILE_FIELD_NAMES.constanciaNumero]: [
          multerFile(LC_FILE_FIELD_NAMES.constanciaNumero),
        ],
      },
    );

    expect(parsed.fotosLicencias.fachada).toBeDefined();
    expect(parsed.archivosLc.constanciaNumero).toBeDefined();
  });

  it('las cuatro firmas usan los tipos 25-28 con maxCount 1', async () => {
    const firmas: LcFileKey[] = [
      'FirmaPropietario',
      'FirmaDRO',
      'FirmaCorresponsable',
      'FirmaResponsableRecepcionDocumento',
    ];
    const files = Object.fromEntries(
      firmas.map((key) => [
        LC_FILE_FIELD_NAMES[key],
        [multerFile(LC_FILE_FIELD_NAMES[key])],
      ]),
    );
    const parsed = await parseRegistroMultipart(
      { ...BODY_BASE, PredioObra: '1' },
      files,
    );

    for (const key of firmas) {
      expect(parsed.archivosLc[key]).toBeDefined();
    }
    expect(LC_FILE_TIPO_FOTO.FirmaPropietario).toBe(25);
    expect(LC_FILE_TIPO_FOTO.FirmaDRO).toBe(26);
    expect(LC_FILE_TIPO_FOTO.FirmaCorresponsable).toBe(27);
    expect(LC_FILE_TIPO_FOTO.FirmaResponsableRecepcionDocumento).toBe(28);
  });

  it('permite crear PredioObra = 1 sin ningún archivo', async () => {
    const parsed = await parseRegistroMultipart(
      { ...BODY_BASE, PredioObra: '1' },
      {},
    );

    expect(parsed.crearLicenciaConstruccion).toBe(true);
    expect(Object.keys(parsed.archivosLc)).toHaveLength(0);
  });
});
