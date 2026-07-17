import { BadRequestException } from '@nestjs/common';
import {
  CATASTRO_FILE_FIELD_NAMES,
  CATASTRO_FILE_FORM_TO_KEY,
  CATASTRO_TIPO_FOTO,
  CatastroFotoKey,
} from 'src/registros/catastro.constants';
import {
  LICENCIAS_FILE_FIELD_NAMES,
  LICENCIAS_FILE_FORM_TO_KEY,
  LICENCIAS_TIPO_FOTO,
  LicenciasFotoKey,
} from 'src/registros/licencias.constants';
import {
  PROTECCION_CIVIL_FILE_FIELD_NAMES,
  PROTECCION_CIVIL_FILE_FORM_TO_KEY,
  PROTECCION_CIVIL_TIPO_FOTO,
  ProteccionCivilFotoKey,
} from 'src/registros/proteccion-civil.constants';
import {
  SAPAC_FILE_FIELD_NAMES,
  SAPAC_FILE_FORM_TO_KEY,
  SAPAC_TIPO_FOTO,
  SapacFotoKey,
} from 'src/registros/sapac.constants';
import { RegistroPhotoInput } from 'src/registros/sapac-storage.service';

export const FOTOS_FLUJO0_FIELD_NAMES = new Set<string>([
  ...Object.values(SAPAC_FILE_FIELD_NAMES),
  ...Object.values(CATASTRO_FILE_FIELD_NAMES),
  ...Object.values(LICENCIAS_FILE_FIELD_NAMES),
  ...Object.values(PROTECCION_CIVIL_FILE_FIELD_NAMES),
]);

export type ParsedFotosFlujo0 = {
  photoInputs: RegistroPhotoInput[];
  hasFotos: boolean;
  needsSapac: boolean;
  needsCatastro: boolean;
  needsLicencias: boolean;
  needsProteccionCivil: boolean;
};

/**
 * Sanitiza archivos del flujo PredioObra = 0.
 * PredioObra = 1 → descarta (no validar ni guardar).
 */
export function sanitizeFotosFlujo0ByPredioObra(
  files: Record<string, Express.Multer.File[] | undefined> | undefined,
  predioObraEfectivo: 0 | 1,
): Record<string, Express.Multer.File[]> {
  const result: Record<string, Express.Multer.File[]> = {};
  if (!files || predioObraEfectivo !== 0) {
    return result;
  }

  for (const [key, list] of Object.entries(files)) {
    if (!FOTOS_FLUJO0_FIELD_NAMES.has(key) || !list?.length) continue;
    const valid = list.filter((f) => f?.buffer?.length);
    if (valid.length) result[key] = valid;
  }
  return result;
}

/**
 * Parsea los 9 campos de Fotos (1 archivo c/u) a RegistroPhotoInput[].
 */
export function parseFotosFlujo0Actualizar(
  sanitizedFiles: Record<string, Express.Multer.File[]>,
): ParsedFotosFlujo0 {
  const photoInputs: RegistroPhotoInput[] = [];
  let needsSapac = false;
  let needsCatastro = false;
  let needsLicencias = false;
  let needsProteccionCivil = false;

  for (const [formName, files] of Object.entries(sanitizedFiles)) {
    if (!files?.length) continue;

    if (!FOTOS_FLUJO0_FIELD_NAMES.has(formName)) {
      throw new BadRequestException(
        `Campo de archivo no reconocido: "${formName}"`,
      );
    }

    if (files.length > 1) {
      throw new BadRequestException(
        `Solo se permite un archivo para "${formName}"`,
      );
    }

    const file = files[0];
    const sapacKey = SAPAC_FILE_FORM_TO_KEY[formName] as SapacFotoKey | undefined;
    if (sapacKey) {
      needsSapac = true;
      photoInputs.push({
        key: formName,
        file,
        idTipoFoto: SAPAC_TIPO_FOTO[sapacKey],
      });
      continue;
    }

    const catastroKey = CATASTRO_FILE_FORM_TO_KEY[formName] as
      | CatastroFotoKey
      | undefined;
    if (catastroKey) {
      needsCatastro = true;
      photoInputs.push({
        key: formName,
        file,
        idTipoFoto: CATASTRO_TIPO_FOTO[catastroKey],
      });
      continue;
    }

    const licenciasKey = LICENCIAS_FILE_FORM_TO_KEY[formName] as
      | LicenciasFotoKey
      | undefined;
    if (licenciasKey) {
      needsLicencias = true;
      photoInputs.push({
        key: formName,
        file,
        idTipoFoto: LICENCIAS_TIPO_FOTO[licenciasKey],
      });
      continue;
    }

    const pcKey = PROTECCION_CIVIL_FILE_FORM_TO_KEY[formName] as
      | ProteccionCivilFotoKey
      | undefined;
    if (pcKey) {
      needsProteccionCivil = true;
      photoInputs.push({
        key: formName,
        file,
        idTipoFoto: PROTECCION_CIVIL_TIPO_FOTO[pcKey],
      });
    }
  }

  return {
    photoInputs,
    hasFotos: photoInputs.length > 0,
    needsSapac,
    needsCatastro,
    needsLicencias,
    needsProteccionCivil,
  };
}
