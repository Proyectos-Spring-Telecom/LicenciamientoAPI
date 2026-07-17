import { BadRequestException } from '@nestjs/common';
import {
  parseFotosFlujo0Actualizar,
  sanitizeFotosFlujo0ByPredioObra,
} from './registro-actualizar-fotos-flujo0';
import { SAPAC_FILE_FIELD_NAMES } from 'src/registros/sapac.constants';
import { FIRMA_FIELD_NAMES } from 'src/registros/licencia-construccion.constants';

describe('registro-actualizar-fotos-flujo0', () => {
  const fake = (name: string): Express.Multer.File =>
    ({
      fieldname: name,
      originalname: `${name}.jpg`,
      mimetype: 'image/jpeg',
      buffer: Buffer.from('x'),
      size: 1,
    }) as Express.Multer.File;

  it('descarta archivos flujo 0 cuando PredioObra = 1', () => {
    const sanitized = sanitizeFotosFlujo0ByPredioObra(
      {
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fake(SAPAC_FILE_FIELD_NAMES.reciboSapac),
        ],
      },
      1,
    );
    expect(sanitized).toEqual({});
  });

  it('parsea Sapac.reciboSapac → IdTipoFoto 3', () => {
    const sanitized = sanitizeFotosFlujo0ByPredioObra(
      {
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fake(SAPAC_FILE_FIELD_NAMES.reciboSapac),
        ],
        [FIRMA_FIELD_NAMES.FirmaPropietario]: [
          fake(FIRMA_FIELD_NAMES.FirmaPropietario),
        ],
      },
      0,
    );
    expect(sanitized[FIRMA_FIELD_NAMES.FirmaPropietario]).toBeUndefined();
    const parsed = parseFotosFlujo0Actualizar(sanitized);
    expect(parsed.hasFotos).toBe(true);
    expect(parsed.needsSapac).toBe(true);
    expect(parsed.photoInputs[0].idTipoFoto).toBe(3);
  });

  it('rechaza más de un archivo por campo', () => {
    expect(() =>
      parseFotosFlujo0Actualizar({
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: [
          fake('a'),
          fake('b'),
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
