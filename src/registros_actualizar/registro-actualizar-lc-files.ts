import { BadRequestException } from '@nestjs/common';
import {
  LC_FILE_FIELD_NAMES,
  LC_FILE_FORM_TO_KEY,
  LcFileKey,
} from 'src/registros/licencia-construccion.constants';
import { LcFiles } from 'src/registros/licencia-construccion-storage.service';

/** Nombres multipart de LicenciaConstruccion (misma fuente que POST). */
export const UPDATE_LC_FILE_FIELD_NAMES = new Set<string>(
  Object.values(LC_FILE_FIELD_NAMES),
);

export type ParsedLcActualizarFiles = {
  archivosLc: LcFiles;
  hasArchivosLc: boolean;
};

/**
 * Sanitiza archivos LC según PredioObra efectivo.
 * PredioObra = 0 → vacío (no validar ni guardar LC).
 * PredioObra = 1 → conserva únicamente campos LC con buffer válido.
 */
export function sanitizeLcFilesByPredioObra(
  files: Record<string, Express.Multer.File[] | undefined> | undefined,
  predioObraEfectivo: 0 | 1,
): Record<string, Express.Multer.File[]> {
  const result: Record<string, Express.Multer.File[]> = {};
  if (!files || predioObraEfectivo !== 1) {
    return result;
  }

  for (const [key, list] of Object.entries(files)) {
    if (!UPDATE_LC_FILE_FIELD_NAMES.has(key) || !list?.length) continue;
    const valid = list.filter((f) => f?.buffer?.length);
    if (valid.length) result[key] = valid;
  }

  return result;
}

/**
 * Reconstruye archivos individuales de LC (máx. 1 por campo).
 * Rechaza nombres no reconocidos cuando traen archivos.
 */
export function parseLcActualizarFiles(
  sanitizedFiles: Record<string, Express.Multer.File[]>,
): ParsedLcActualizarFiles {
  const archivosLc: LcFiles = {};

  for (const [formName, files] of Object.entries(sanitizedFiles)) {
    const lcKey = LC_FILE_FORM_TO_KEY[formName];

    if (!lcKey) {
      if (files?.length) {
        throw new BadRequestException(
          `Campo de archivo no reconocido: "${formName}"`,
        );
      }
      continue;
    }
    if (!files?.length) continue;

    if (files.length > 1) {
      throw new BadRequestException(
        `Solo se permite un archivo para "${formName}"`,
      );
    }
    archivosLc[lcKey as LcFileKey] = files[0];
  }

  return {
    archivosLc,
    hasArchivosLc: Object.keys(archivosLc).length > 0,
  };
}
