import { BadRequestException } from '@nestjs/common';
import {
  sanitizeLcFilesByPredioObra,
  parseLcActualizarFiles,
} from './registro-actualizar-lc-files';
import {
  FIRMA_FIELD_NAMES,
  LC_DOCUMENTO_FIELD_NAMES,
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

  it('descarta firmas/documentos cuando PredioObra = 0', () => {
    const sanitized = sanitizeLcFilesByPredioObra(
      {
        [FIRMA_FIELD_NAMES.FirmaPropietario]: [
          fakeFile(FIRMA_FIELD_NAMES.FirmaPropietario),
        ],
        [LC_DOCUMENTO_FIELD_NAMES.Factibilidad]: [
          fakeFile(LC_DOCUMENTO_FIELD_NAMES.Factibilidad),
        ],
      },
      0,
    );
    expect(sanitized).toEqual({});
  });

  it('conserva firmas/documentos cuando PredioObra = 1', () => {
    const sanitized = sanitizeLcFilesByPredioObra(
      {
        [FIRMA_FIELD_NAMES.FirmaDRO]: [fakeFile(FIRMA_FIELD_NAMES.FirmaDRO)],
        [LC_DOCUMENTO_FIELD_NAMES.otros]: [
          fakeFile('a'),
          fakeFile('b'),
        ],
      },
      1,
    );
    expect(Object.keys(sanitized)).toHaveLength(2);
    const parsed = parseLcActualizarFiles(sanitized);
    expect(parsed.hasFirmas).toBe(true);
    expect(parsed.hasDocumentos).toBe(true);
    expect(parsed.firmas.FirmaDRO).toBeDefined();
    expect(parsed.documentosLc.otros).toHaveLength(2);
  });

  it('rechaza campo de archivo no reconocido', () => {
    expect(() =>
      parseLcActualizarFiles({
        'campo.desconocido': [fakeFile('x')],
      }),
    ).toThrow(BadRequestException);
  });
});
