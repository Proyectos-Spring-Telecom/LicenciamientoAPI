import { FIRMA_FIELD_NAMES } from './licencia-construccion.constants';
import { LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES } from './licencias.constants';

const LC_PREFIX = 'LicenciaConstruccion.';
const SAPAC_PREFIX = 'Sapac.';
const CATASTRO_PREFIX = 'Catastro.';
const LICENCIAS_PREFIX = 'Licencias.';
const PROTECCION_CIVIL_PREFIX = 'ProteccionCivil.';

/**
 * Normaliza PredioObra desde multipart.
 * No usar Boolean(value): Boolean('0') === true.
 * Solo '1' / 1 → 1; cualquier otro valor se trata como 0 para sanitización.
 * La validación formal del DTO sigue garantizando que solo se acepten 0 o 1.
 */
export function normalizePredioObra(value: unknown): 0 | 1 {
  if (value === '1' || value === 1) return 1;
  return 0;
}

/**
 * Detecta valores vacíos típicos de form-data.
 * No usar `if (!value)`: eliminaría incorrectamente 0 y '0' (válidos en tinyint).
 */
export function isEmptyFormDataValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** True si el contacto tiene al menos un campo con información válida. */
export function hasContactoData(contacto?: {
  Nombre?: string;
  ApellidoPaterno?: string;
  ApellidoMaterno?: string;
  Telefono?: string;
  Correo?: string;
}): boolean {
  if (!contacto) return false;
  return [
    contacto.Nombre,
    contacto.ApellidoPaterno,
    contacto.ApellidoMaterno,
    contacto.Telefono,
    contacto.Correo,
  ].some((value) => !isEmptyFormDataValue(value));
}

/** True si el corresponsable tiene al menos un campo con información válida. */
export function hasCorresponsableData(corresponsable?: {
  NombreCompleto?: string;
  NoRegLicenciaConstruccion?: string;
  CedulaProfesional?: string;
}): boolean {
  if (!corresponsable) return false;
  return [
    corresponsable.NombreCompleto,
    corresponsable.NoRegLicenciaConstruccion,
    corresponsable.CedulaProfesional,
  ].some((value) => !isEmptyFormDataValue(value));
}

/**
 * Conserva únicamente la sección que corresponde al flujo de PredioObra.
 * Los campos raíz permanecen para que el DTO principal realice su validación.
 */
export function sanitizeFieldsByPredioObra(
  body: Record<string, unknown>,
  predioObra: 0 | 1,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body ?? {})) {
    if (predioObra === 0 && key.startsWith(LC_PREFIX)) continue;
    if (
      predioObra === 1 &&
      (key.startsWith(SAPAC_PREFIX) ||
        key.startsWith(CATASTRO_PREFIX) ||
        key.startsWith(LICENCIAS_PREFIX) ||
        key.startsWith(PROTECCION_CIVIL_PREFIX))
    ) {
      continue;
    }

    if (
      (key.startsWith(LC_PREFIX) ||
        key.startsWith(SAPAC_PREFIX) ||
        key.startsWith(CATASTRO_PREFIX) ||
        key.startsWith(LICENCIAS_PREFIX) ||
        key.startsWith(PROTECCION_CIVIL_PREFIX)) &&
      isEmptyFormDataValue(value)
    ) {
      continue;
    }
    result[key] = value;
  }

  return result;
}

/**
 * Conserva las entradas de Multer; la validación posterior rechaza archivos vacíos.
 * Excepción transversal: Licencias.fachada / estacionamiento / bodega
 * nunca se excluyen por PredioObra (se procesan en ambos flujos).
 */
export function sanitizeMultipartFiles(
  files: Record<string, Express.Multer.File[] | undefined> | undefined,
  predioObra?: 0 | 1,
): Record<string, Express.Multer.File[]> {
  const result: Record<string, Express.Multer.File[]> = {};
  for (const [key, list] of Object.entries(files ?? {})) {
    if (
      predioObra === 0 &&
      key.startsWith(LC_PREFIX)
    ) {
      continue;
    }
    if (
      predioObra === 1 &&
      !LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES.has(key) &&
      (key.startsWith(SAPAC_PREFIX) ||
        key.startsWith(CATASTRO_PREFIX) ||
        key.startsWith(LICENCIAS_PREFIX) ||
        key.startsWith(PROTECCION_CIVIL_PREFIX))
    ) {
      continue;
    }
    if (list?.length) result[key] = list;
  }
  return result;
}

/**
 * Limpia campos LicenciaConstruccion.* del body según PredioObra.
 * - PredioObra = 0: elimina TODAS las claves LicenciaConstruccion.*
 * - PredioObra = 1: elimina solo las vacías; conserva 0/'0'/1/'1' y demás valores.
 * Devuelve una copia; no muta el original.
 */
export function sanitizeLicenciaConstruccionFields(
  body: Record<string, unknown>,
  predioObra: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const dropAllLc = predioObra !== 1;

  for (const [key, value] of Object.entries(body ?? {})) {
    if (key.startsWith(LC_PREFIX)) {
      if (dropAllLc) continue;
      if (isEmptyFormDataValue(value)) continue;
    }
    result[key] = value;
  }

  return result;
}

/**
 * Limpia archivos de firmas de LicenciaConstruccion según PredioObra.
 * - PredioObra = 0: elimina todas las firmas (no guardar, no validar).
 * - PredioObra = 1: conserva solo entradas con al menos un archivo real.
 * Devuelve una copia; no muta el original.
 */
export function sanitizeLicenciaConstruccionFiles(
  files: Record<string, Express.Multer.File[] | undefined> | undefined,
  predioObra: number,
): Record<string, Express.Multer.File[]> {
  const result: Record<string, Express.Multer.File[]> = {};
  const firmaNames = new Set(Object.values(FIRMA_FIELD_NAMES) as string[]);

  if (!files) return result;

  if (predioObra !== 1) {
    // Conservar solo archivos que NO sean de licencia (hoy no hay otros).
    for (const [key, list] of Object.entries(files)) {
      if (firmaNames.has(key)) continue;
      if (list?.length) result[key] = list;
    }
    return result;
  }

  for (const [key, list] of Object.entries(files)) {
    if (!list?.length) continue;
    // Filtrar archivos sin buffer (placeholders vacíos del formulario)
    const valid = list.filter((f) => f?.buffer?.length);
    if (valid.length) result[key] = valid;
  }

  return result;
}
