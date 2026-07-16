import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { FIRMA_EXT_BY_MIME } from './licencia-construccion.constants';
import { assertValidRegistroFile } from './registro-file.validation';
import {
  SAPAC_TIPO_FOTO,
  SapacFotoKey,
} from './sapac.constants';
import {
  buildPublicFileUrl,
  resolvePublicBaseUrl,
} from './storage-public-url';

export type SapacFotoFiles = Partial<
  Record<SapacFotoKey, Express.Multer.File>
>;

export interface RegistroPhotoInput {
  key: string;
  file: Express.Multer.File;
  idTipoFoto: number;
}

export interface SavedRegistroPhoto {
  key: string;
  idTipoFoto: number;
  fileName: string;
  /** Ruta física absoluta (escritura / cleanup). */
  absolutePath: string;
  /** URL pública persistida en Fotos.Ruta y response. */
  publicUrl: string;
}

/** @deprecated alias de SavedRegistroPhoto para compatibilidad SAPAC */
export type SavedSapacFotoFile = SavedRegistroPhoto;

/**
 * Almacenamiento físico bajo FOTOS_REGISTROS_STORAGE_PATH
 * y URL pública bajo FOTOS_REGISTROS_PUBLIC_URL (tabla Fotos).
 */
@Injectable()
export class SapacStorageService implements OnModuleInit {
  private readonly logger = new Logger(SapacStorageService.name);
  private basePath!: string;
  private publicBaseUrl!: string;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit(): void {
    this.resolveBasePath();
    this.resolvePublicUrl();
  }

  private resolveBasePath(): string {
    const raw = this.configService.get<string>('FOTOS_REGISTROS_STORAGE_PATH');
    if (!raw?.trim()) {
      this.logger.error('FOTOS_REGISTROS_STORAGE_PATH no está configurada');
      throw new InternalServerErrorException(
        'No se encuentra configurada la ruta de almacenamiento.',
      );
    }
    this.basePath = path.resolve(raw.trim());
    return this.basePath;
  }

  private resolvePublicUrl(): string {
    try {
      this.publicBaseUrl = resolvePublicBaseUrl(
        this.configService.get<string>('FOTOS_REGISTROS_PUBLIC_URL'),
      );
      return this.publicBaseUrl;
    } catch (error) {
      this.logger.error('FOTOS_REGISTROS_PUBLIC_URL no está configurada o es inválida');
      throw error;
    }
  }

  private getBasePath(): string {
    return this.basePath || this.resolveBasePath();
  }

  private getPublicBaseUrl(): string {
    return this.publicBaseUrl || this.resolvePublicUrl();
  }

  assertValidFiles(files: SapacFotoFiles): void {
    for (const key of Object.keys(files) as SapacFotoKey[]) {
      const file = files[key];
      if (file) assertValidRegistroFile(file, key);
    }
  }

  assertValidPhotoInputs(items: RegistroPhotoInput[]): void {
    for (const item of items) {
      assertValidRegistroFile(item.file, item.key);
    }
  }

  /**
   * Guarda uno o más archivos en:
   * {base}/{IdRegistro}/{IdTipoFoto}/{uuid}.ext
   * y construye URL pública equivalente.
   */
  async saveRegistroPhotos(
    idRegistro: number,
    items: RegistroPhotoInput[],
  ): Promise<{ saved: SavedRegistroPhoto[]; absoluteCreated: string[] }> {
    const base = this.getBasePath();
    const publicBase = this.getPublicBaseUrl();
    const saved: SavedRegistroPhoto[] = [];
    const absoluteCreated: string[] = [];

    try {
      for (const item of items) {
        assertValidRegistroFile(item.file, item.key);
        const ext = FIRMA_EXT_BY_MIME[item.file.mimetype.toLowerCase()];
        if (!ext) {
          throw new BadRequestException(
            `El archivo "${item.key}" no tiene un tipo permitido`,
          );
        }

        const fileName = `${randomUUID()}${ext}`;
        const targetDirectory = path.join(
          base,
          String(idRegistro),
          String(item.idTipoFoto),
        );
        await fs.mkdir(targetDirectory, { recursive: true });

        const fullFilePath = path.normalize(
          path.join(targetDirectory, fileName),
        );
        const resolved = path.resolve(fullFilePath);
        if (!resolved.startsWith(path.resolve(base) + path.sep)) {
          throw new BadRequestException('Ruta de archivo no permitida');
        }

        await fs.writeFile(fullFilePath, item.file.buffer);
        absoluteCreated.push(fullFilePath);

        const publicUrl = buildPublicFileUrl(
          publicBase,
          idRegistro,
          item.idTipoFoto,
          fileName,
        );

        saved.push({
          key: item.key,
          idTipoFoto: item.idTipoFoto,
          fileName,
          absolutePath: fullFilePath,
          publicUrl,
        });
      }

      return { saved, absoluteCreated };
    } catch (error) {
      await this.cleanup(absoluteCreated);
      throw error;
    }
  }

  /** Wrapper SAPAC: mapea claves conocidas a IdTipoFoto 3/4/5. */
  async saveFiles(
    idRegistro: number,
    files: SapacFotoFiles,
  ): Promise<{ saved: SavedRegistroPhoto[]; absoluteCreated: string[] }> {
    const items: RegistroPhotoInput[] = [];
    for (const key of Object.keys(SAPAC_TIPO_FOTO) as SapacFotoKey[]) {
      const file = files[key];
      if (!file) continue;
      items.push({
        key,
        file,
        idTipoFoto: SAPAC_TIPO_FOTO[key],
      });
    }
    return this.saveRegistroPhotos(idRegistro, items);
  }

  async cleanup(absolutePaths: string[]): Promise<void> {
    const dirs = new Set<string>();
    for (const absolutePath of absolutePaths) {
      try {
        await fs.unlink(absolutePath);
        dirs.add(path.dirname(absolutePath));
      } catch (error: unknown) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code?: string }).code
            : undefined;
        if (code !== 'ENOENT') {
          this.logger.warn(
            `No se pudo eliminar archivo temporal: ${error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    for (const dir of dirs) {
      await this.tryRemoveEmptyDir(dir);
      await this.tryRemoveEmptyDir(path.dirname(dir));
    }
  }

  private async tryRemoveEmptyDir(dir: string): Promise<void> {
    try {
      const base = path.resolve(this.getBasePath());
      const resolved = path.resolve(dir);
      if (resolved === base || !resolved.startsWith(base + path.sep)) return;
      await fs.rmdir(resolved);
    } catch {
      // La carpeta contiene archivos o ya no existe.
    }
  }
}
