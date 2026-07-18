import { BadRequestException } from '@nestjs/common';
import {
  sanitizeLcFilesByPredioObra,
  parseLcActualizarFiles,
} from './registro-actualizar-lc-files';
import {
  LC_FILE_FIELD_NAMES,
  LC_FILE_TIPO_FOTO,
} from 'src/registros/licencia-construccion.constants';

describe('registro-actualizar-lc-files', () => {
  const fakeFile = (name: string): Express.Multer.File =>
    ({
      fieldname: name,
      originalname: `${name}.png`,
      mimetype: 'image/png',
      buffer: Buffer.from('x'),
      size: 1,
    }) as Express.Multer.File;

  it('descarta archivos LC cuando PredioObra = 0', () => {
    const sanitized = sanitizeLcFilesByPredioObra(
      {
        [LC_FILE_FIELD_NAMES.FirmaPropietario]: [
          fakeFile(LC_FILE_FIELD_NAMES.FirmaPropietario),
        ],
        [LC_FILE_FIELD_NAMES.Factibilidad]: [
          fakeFile(LC_FILE_FIELD_NAMES.Factibilidad),
        ],
        [LC_FILE_FIELD_NAMES.constanciaNumero]: [
          fakeFile(LC_FILE_FIELD_NAMES.constanciaNumero),
        ],
      },
      0,
    );
    expect(sanitized).toEqual({});
  });

  it('conserva archivos individuales cuando PredioObra = 1', () => {
    const sanitized = sanitizeLcFilesByPredioObra(
      {
        [LC_FILE_FIELD_NAMES.FirmaDRO]: [
          fakeFile(LC_FILE_FIELD_NAMES.FirmaDRO),
        ],
        [LC_FILE_FIELD_NAMES.otros]: [fakeFile(LC_FILE_FIELD_NAMES.otros)],
        [LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos2]: [
          fakeFile(LC_FILE_FIELD_NAMES.JuegoDePlanosArquitectonicos2),
        ],
      },
      1,
    );
    expect(Object.keys(sanitized)).toHaveLength(3);
    const parsed = parseLcActualizarFiles(sanitized);
    expect(parsed.hasArchivosLc).toBe(true);
    expect(parsed.archivosLc.FirmaDRO).toBeDefined();
    expect(parsed.archivosLc.otros).toBeDefined();
    expect(parsed.archivosLc.JuegoDePlanosArquitectonicos2).toBeDefined();
  });

  it('mapea los tres planos a tipos distintos 17/31/32', () => {
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos1).toBe(17);
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos2).toBe(31);
    expect(LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos3).toBe(32);
    expect(LC_FILE_TIPO_FOTO.constanciaNumero).toBe(29);
  });

  it('rechaza dos archivos en el mismo campo', () => {
    expect(() =>
      parseLcActualizarFiles({
        [LC_FILE_FIELD_NAMES.RecibosImpuestoPredial]: [
          fakeFile('a'),
          fakeFile('b'),
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    'LicenciaConstruccion.constanciaAlineamientoyNumero',
    'LicenciaConstruccion.LicenciaUsoyPlano',
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos',
  ])('rechaza campo antiguo %s', (oldField) => {
    expect(() =>
      parseLcActualizarFiles({
        [oldField]: [fakeFile(oldField)],
      }),
    ).toThrow(`Campo de archivo no reconocido: "${oldField}"`);
  });

  it('rechaza campo de archivo no reconocido', () => {
    expect(() =>
      parseLcActualizarFiles({
        'campo.desconocido': [fakeFile('x')],
      }),
    ).toThrow(BadRequestException);
  });
});
