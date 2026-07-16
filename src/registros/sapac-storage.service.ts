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
  absolutePath: string;
}

/** @deprecated alias de SavedRegistroPhoto para compatibilidad SAPAC */
export type SavedSapacFotoFile = SavedRegistroPhoto;

/**
 * Almacenamiento físico bajo FOTOS_REGISTROS_STORAGE_PATH
 * para fotografías SAPAC y Catastro (tabla Fotos).
 */
@Injectable()
export class SapacStorageService implements OnModuleInit {
  private readonly logger = new Logger(SapacStorageService.name);
  private basePath!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.resolveBasePath();
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

  private getBasePath(): string {
    return this.basePath || this.resolveBasePath();
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
   */
  async saveRegistroPhotos(
    idRegistro: number,
    items: RegistroPhotoInput[],
  ): Promise<{ saved: SavedRegistroPhoto[]; absoluteCreated: string[] }> {
    const base = this.getBasePath();
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

        const targetDirectory = path.join(
          base,
          String(idRegistro),
          String(item.idTipoFoto),
        );
        await fs.mkdir(targetDirectory, { recursive: true });

        const fullFilePath = path.normalize(
          path.join(targetDirectory, `${randomUUID()}${ext}`),
        );
        const resolved = path.resolve(fullFilePath);
        if (!resolved.startsWith(path.resolve(base) + path.sep)) {
          throw new BadRequestException('Ruta de archivo no permitida');
        }

        await fs.writeFile(fullFilePath, item.file.buffer);
        absoluteCreated.push(fullFilePath);
        saved.push({
          key: item.key,
          idTipoFoto: item.idTipoFoto,
          absolutePath: fullFilePath,
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
            `No se pudo eliminar archivo temporal: ${
              error instanceof Error ? error.message : String(error)
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
