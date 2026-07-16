import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import {
  FIRMA_ALLOWED_EXT,
  FIRMA_ALLOWED_MIME,
} from './licencia-construccion.constants';

/** Validación común para archivos JPG/JPEG/PNG/PDF recibidos en memoria. */
export function assertValidRegistroFile(
  file: Express.Multer.File,
  fieldLabel: string,
): void {
  if (!file?.buffer?.length) {
    throw new BadRequestException(
      `El archivo "${fieldLabel}" está vacío o no es válido`,
    );
  }

  const mime = (file.mimetype || '').toLowerCase();
  if (!FIRMA_ALLOWED_MIME.has(mime)) {
    throw new BadRequestException(
      `El archivo "${fieldLabel}" no tiene un tipo permitido (JPG, JPEG, PNG o PDF)`,
    );
  }

  const originalExt = path.extname(file.originalname || '').toLowerCase();
  if (originalExt && !FIRMA_ALLOWED_EXT.has(originalExt)) {
    throw new BadRequestException(
      `El archivo "${fieldLabel}" tiene una extensión no permitida`,
    );
  }

  const name = file.originalname || '';
  if (/\.(exe|bat|cmd|js|msi|sh|php)(\.|$)/i.test(name)) {
    throw new BadRequestException(
      `El archivo "${fieldLabel}" no es un tipo permitido`,
    );
  }
}
