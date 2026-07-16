import { InternalServerErrorException } from '@nestjs/common';

/**
 * Une segmentos de URL pública sin usar path.join (Windows usa \\).
 * Ejemplo: https://host/base/25/9/uuid.pdf
 */
export function buildPublicFileUrl(
  baseUrl: string,
  idRegistro: string | number,
  idTipoFoto: number,
  fileName: string,
): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

  return [
    normalizedBaseUrl,
    encodeURIComponent(String(idRegistro)),
    encodeURIComponent(String(idTipoFoto)),
    encodeURIComponent(fileName),
  ].join('/');
}

/** Valida y normaliza una URL pública base desde configuración. */
export function resolvePublicBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new InternalServerErrorException(
      'No está configurada la URL pública de archivos.',
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new InternalServerErrorException(
      'La URL pública de archivos no es válida.',
    );
  }

  return value.replace(/\/+$/, '');
}
