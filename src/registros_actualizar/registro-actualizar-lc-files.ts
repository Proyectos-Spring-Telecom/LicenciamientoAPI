import { BadRequestException } from '@nestjs/common';
import {
  FIRMA_FIELD_NAMES,
  FIRMA_FORM_TO_KEY,
  FirmaKey,
  LC_DOCUMENTO_FIELD_NAMES,
  LC_DOCUMENTO_FORM_TO_KEY,
  LcDocumentoKey,
  MAX_DOCUMENTOS_POR_TIPO,
} from 'src/registros/licencia-construccion.constants';
import {
  FirmaFiles,
  LcDocumentoFiles,
} from 'src/registros/licencia-construccion-storage.service';

const LC_FILE_FIELD_NAMES = new Set<string>([
  ...Object.values(FIRMA_FIELD_NAMES),
  ...Object.values(LC_DOCUMENTO_FIELD_NAMES),
]);

export type ParsedLcActualizarFiles = {
  firmas: FirmaFiles;
  documentosLc: LcDocumentoFiles;
  hasFirmas: boolean;
  hasDocumentos: boolean;
};

/**
 * Sanitiza archivos LC según PredioObra efectivo.
 * PredioObra = 0 → vacío (no validar ni guardar LC).
 * PredioObra = 1 → conserva únicamente firmas/documentos LC con buffer válido.
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
    if (!LC_FILE_FIELD_NAMES.has(key) || !list?.length) continue;
    const valid = list.filter((f) => f?.buffer?.length);
    if (valid.length) result[key] = valid;
  }

  return result;
}

/**
 * Reconstruye firmas (1 archivo) y documentos (N) desde Multer.
 * Rechaza nombres no reconocidos cuando traen archivos.
 */
export function parseLcActualizarFiles(
  sanitizedFiles: Record<string, Express.Multer.File[]>,
): ParsedLcActualizarFiles {
  const firmas: FirmaFiles = {};
  const documentosLc: LcDocumentoFiles = {};

  for (const [formName, files] of Object.entries(sanitizedFiles)) {
    const firmaKey = FIRMA_FORM_TO_KEY[formName];
    const documentoKey = LC_DOCUMENTO_FORM_TO_KEY[formName];

    if (!firmaKey && !documentoKey) {
      if (files?.length) {
        throw new BadRequestException(
          `Campo de archivo no reconocido: "${formName}"`,
        );
      }
      continue;
    }
    if (!files?.length) continue;

    if (documentoKey) {
      if (files.length > MAX_DOCUMENTOS_POR_TIPO) {
        throw new BadRequestException(
          `El campo ${formName} excede el máximo permitido de documentos.`,
        );
      }
      documentosLc[documentoKey as LcDocumentoKey] = files;
      continue;
    }

    if (files.length > 1) {
      throw new BadRequestException(
        `Solo se permite un archivo para "${formName}"`,
      );
    }
    firmas[firmaKey as FirmaKey] = files[0];
  }

  return {
    firmas,
    documentosLc,
    hasFirmas: Object.keys(firmas).length > 0,
    hasDocumentos: Object.values(documentosLc).some(
      (list) => (list?.length ?? 0) > 0,
    ),
  };
}
