import { describe, expect, it } from '@jest/globals';
import { sanitizeMultipartFiles } from './licencia-construccion.sanitize';
import {
  LICENCIAS_FILE_FIELD_NAMES,
  LICENCIAS_TIPO_FOTO,
} from './licencias.constants';
import { parseRegistroMultipart } from './registro-form.parser';

function multerFile(fieldname: string): Express.Multer.File {
  return {
    fieldname,
    originalname: 'foto.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('contenido'),
    size: 9,
  } as Express.Multer.File;
}

const BODY_BASE = {
  Latitud: '18.95',
  Longitud: '-99.23',
  TipoRegistro: '0',
};

describe('archivos transversales de Licencias (fachada/estacionamiento/bodega)', () => {
  it('mapea tipos 6, 7 y 8 sin cambios', () => {
    expect(LICENCIAS_TIPO_FOTO.fachada).toBe(6);
    expect(LICENCIAS_TIPO_FOTO.estacionamiento).toBe(7);
    expect(LICENCIAS_TIPO_FOTO.bodega).toBe(8);
    expect(LICENCIAS_TIPO_FOTO.licenciaFuncionamiento).toBe(1);
  });

  describe('sanitizeMultipartFiles', () => {
    it('conserva los tres transversales cuando PredioObra = 1', () => {
      const files = {
        [LICENCIAS_FILE_FIELD_NAMES.fachada]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.fachada),
        ],
        [LICENCIAS_FILE_FIELD_NAMES.estacionamiento]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.estacionamiento),
        ],
        [LICENCIAS_FILE_FIELD_NAMES.bodega]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.bodega),
        ],
        [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento),
        ],
        'Sapac.reciboSapac': [multerFile('Sapac.reciboSapac')],
        'Catastro.reciboPredial': [multerFile('Catastro.reciboPredial')],
        'ProteccionCivil.vistoBueno': [
          multerFile('ProteccionCivil.vistoBueno'),
        ],
      };

      const result = sanitizeMultipartFiles(files, 1);

      expect(result).toHaveProperty([LICENCIAS_FILE_FIELD_NAMES.fachada]);
      expect(result).toHaveProperty([
        LICENCIAS_FILE_FIELD_NAMES.estacionamiento,
      ]);
      expect(result).toHaveProperty([LICENCIAS_FILE_FIELD_NAMES.bodega]);
      expect(result).not.toHaveProperty([
        LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento,
      ]);
      expect(result).not.toHaveProperty(['Sapac.reciboSapac']);
      expect(result).not.toHaveProperty(['Catastro.reciboPredial']);
      expect(result).not.toHaveProperty(['ProteccionCivil.vistoBueno']);
    });

    it('conserva todos los archivos de Licencias cuando PredioObra = 0', () => {
      const files = {
        [LICENCIAS_FILE_FIELD_NAMES.fachada]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.fachada),
        ],
        [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: [
          multerFile(LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento),
        ],
      };

      const result = sanitizeMultipartFiles(files, 0);

      expect(result).toHaveProperty([LICENCIAS_FILE_FIELD_NAMES.fachada]);
      expect(result).toHaveProperty([
        LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento,
      ]);
    });
  });

  describe('parseRegistroMultipart', () => {
    it('con PredioObra = 1 conserva fachada/estacionamiento/bodega en fotosLicencias', async () => {
      const parsed = await parseRegistroMultipart(
        {
          ...BODY_BASE,
          PredioObra: '1',
          'LicenciaConstruccion.DescripcionProyecto': 'Obra nueva',
        },
        {
          [LICENCIAS_FILE_FIELD_NAMES.fachada]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.fachada),
          ],
          [LICENCIAS_FILE_FIELD_NAMES.estacionamiento]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.estacionamiento),
          ],
          [LICENCIAS_FILE_FIELD_NAMES.bodega]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.bodega),
          ],
        },
      );

      expect(parsed.crearLicenciaConstruccion).toBe(true);
      expect(parsed.crearLicencia).toBe(false);
      expect(parsed.fotosLicencias.fachada).toBeDefined();
      expect(parsed.fotosLicencias.estacionamiento).toBeDefined();
      expect(parsed.fotosLicencias.bodega).toBeDefined();
      expect(parsed.fotosLicencias.licenciaFuncionamiento).toBeUndefined();
    });

    it('con PredioObra = 1 descarta licenciaFuncionamiento (regla actual)', async () => {
      const parsed = await parseRegistroMultipart(
        {
          ...BODY_BASE,
          PredioObra: '1',
        },
        {
          [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento),
          ],
        },
      );

      expect(parsed.fotosLicencias.licenciaFuncionamiento).toBeUndefined();
      expect(Object.keys(parsed.fotosLicencias)).toHaveLength(0);
    });

    it('con PredioObra = 0 conserva fachada (comportamiento previo)', async () => {
      const parsed = await parseRegistroMultipart(
        {
          ...BODY_BASE,
          PredioObra: '0',
        },
        {
          [LICENCIAS_FILE_FIELD_NAMES.fachada]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.fachada),
          ],
          [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: [
            multerFile(LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento),
          ],
        },
      );

      expect(parsed.crearLicencia).toBe(true);
      expect(parsed.fotosLicencias.fachada).toBeDefined();
      expect(parsed.fotosLicencias.licenciaFuncionamiento).toBeDefined();
    });

    it('sin archivos el flujo PredioObra = 1 continúa normalmente', async () => {
      const parsed = await parseRegistroMultipart(
        {
          ...BODY_BASE,
          PredioObra: '1',
        },
        {},
      );

      expect(parsed.crearLicenciaConstruccion).toBe(true);
      expect(Object.keys(parsed.fotosLicencias)).toHaveLength(0);
    });
  });
});
