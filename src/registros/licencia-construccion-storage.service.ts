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
import {
  FIRMA_EXT_BY_MIME,
  FIRMA_TIPO_FOTO,
  FirmaKey,
  LC_DOCUMENTO_FIELDS,
  LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
  LcDocumentoKey,
  MAX_DOCUMENTOS_POR_TIPO,
} from './licencia-construccion.constants';
import { assertValidRegistroFile } from './registro-file.validation';
import {
  buildPublicFileUrl,
  resolvePublicBaseUrl,
} from './storage-public-url';

export type FirmaFiles = Partial<Record<FirmaKey, Express.Multer.File>>;

export type LcDocumentoFiles = Partial<
  Record<LcDocumentoKey, Express.Multer.File[]>
>;

export interface SavedFirmaFile {
  key: FirmaKey;
  idTipoFoto: number;
  fileName: string;
  /** Ruta física absoluta (escritura / cleanup). */
  absolutePath: string;
  /** URL pública persistida en FotosLicenciaConstruccion.Ruta. */
  publicUrl: string;
}

export interface SavedLcDocumentoFile {
  key: LcDocumentoKey;
  idTipoFoto: number;
  fileName: string;
  absolutePath: string;
  publicUrl: string;
}

@Injectable()
export class LicenciaConstruccionStorageService implements OnModuleInit {
  private readonly logger = new Logger(LicenciaConstruccionStorageService.name);
  private basePath!: string;
  private publicBaseUrl!: string;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit(): void {
    this.resolveBasePath();
    this.resolvePublicUrl();
  }

  private resolveBasePath(): string {
    const raw = this.configService.get<string>(
      'LICENCIA_CONSTRUCCION_STORAGE_PATH',
    );
    if (!raw?.trim()) {
      this.logger.error(
        'LICENCIA_CONSTRUCCION_STORAGE_PATH no está configurada',
      );
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
        this.configService.get<string>('LICENCIA_CONSTRUCCION_PUBLIC_URL'),
      );
      return this.publicBaseUrl;
    } catch (error) {
      this.logger.error(
        'LICENCIA_CONSTRUCCION_PUBLIC_URL no está configurada o es inválida',
      );
      throw error;
    }
  }

  getBasePath(): string {
    if (!this.basePath) {
      return this.resolveBasePath();
    }
    return this.basePath;
  }

  private getPublicBaseUrl(): string {
    return this.publicBaseUrl || this.resolvePublicUrl();
  }

  /** Valida archivos en memoria antes de abrir transacción. */
  assertValidFirmaFiles(files: FirmaFiles): void {
    for (const key of Object.keys(files) as FirmaKey[]) {
      const file = files[key];
      if (file) this.assertValidFirmaFile(file, key);
    }
  }

  assertValidFirmaFile(file: Express.Multer.File, fieldLabel: string): void {
    assertValidRegistroFile(file, fieldLabel);
  }

  assertValidDocumentoFiles(files: LcDocumentoFiles): void {
    for (const field of LC_DOCUMENTO_FIELDS) {
      const list = files[field.key];
      if (!list?.length) continue;
      if (list.length > MAX_DOCUMENTOS_POR_TIPO) {
        throw new BadRequestException(
          `El campo ${field.fieldName} excede el máximo permitido de documentos.`,
        );
      }
      list.forEach((file, index) => {
        this.assertValidFirmaFile(file, `${field.fieldName}[${index}]`);
      });
    }
  }

  /**
   * Guarda firmas bajo {base}/{IdRegistro}/{IdTipoFoto}/{uuid}.ext
   */
  async saveFirmas(
    idRegistro: number,
    files: FirmaFiles,
  ): Promise<{ saved: SavedFirmaFile[]; absoluteCreated: string[] }> {
    const saved: SavedFirmaFile[] = [];
    const absoluteCreated: string[] = [];

    try {
      for (const key of Object.keys(FIRMA_TIPO_FOTO) as FirmaKey[]) {
        const file = files[key];
        if (!file) continue;

        this.assertValidFirmaFile(file, key);

        const idTipoFoto = FIRMA_TIPO_FOTO[key];
        const stored = await this.writeFile(idRegistro, idTipoFoto, file);
        absoluteCreated.push(stored.absolutePath);

        saved.push({
          key,
          idTipoFoto,
          fileName: stored.fileName,
          absolutePath: stored.absolutePath,
          publicUrl: stored.publicUrl,
        });
      }

      return { saved, absoluteCreated };
    } catch (error) {
      await this.cleanup(absoluteCreated);
      throw error;
    }
  }

  /**
   * Guarda arreglos de documentos bajo {base}/{IdRegistro}/{IdTipoFoto}/{uuid}.ext
   */
  async saveDocumentoArrays(
    idRegistro: number,
    files: LcDocumentoFiles,
  ): Promise<{ saved: SavedLcDocumentoFile[]; absoluteCreated: string[] }> {
    const saved: SavedLcDocumentoFile[] = [];
    const absoluteCreated: string[] = [];

    try {
      for (const field of LC_DOCUMENTO_FIELDS) {
        const list = files[field.key];
        if (!list?.length) continue;

        if (list.length > MAX_DOCUMENTOS_POR_TIPO) {
          throw new BadRequestException(
            `El campo ${field.fieldName} excede el máximo permitido de documentos.`,
          );
        }

        const idTipoFoto =
          LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO[field.key];

        for (let index = 0; index < list.length; index++) {
          const file = list[index];
          this.assertValidFirmaFile(file, `${field.fieldName}[${index}]`);
          const stored = await this.writeFile(idRegistro, idTipoFoto, file);
          absoluteCreated.push(stored.absolutePath);
          saved.push({
            key: field.key,
            idTipoFoto,
            fileName: stored.fileName,
            absolutePath: stored.absolutePath,
            publicUrl: stored.publicUrl,
          });
        }
      }

      return { saved, absoluteCreated };
    } catch (error) {
      await this.cleanup(absoluteCreated);
      throw error;
    }
  }

  private async writeFile(
    idRegistro: number,
    idTipoFoto: number,
    file: Express.Multer.File,
  ): Promise<{
    fileName: string;
    absolutePath: string;
    publicUrl: string;
  }> {
    const base = this.getBasePath();
    const mime = file.mimetype.toLowerCase();
    const ext =
      FIRMA_EXT_BY_MIME[mime] ??
      (path.extname(file.originalname || '').toLowerCase() || '.bin');

    const fileName = `${randomUUID()}${ext}`;
    const targetDirectory = path.join(
      base,
      String(idRegistro),
      String(idTipoFoto),
    );
    await fs.mkdir(targetDirectory, { recursive: true });

    const fullFilePath = path.normalize(path.join(targetDirectory, fileName));
    const resolved = path.resolve(fullFilePath);
    if (!resolved.startsWith(path.resolve(base) + path.sep)) {
      throw new BadRequestException('Ruta de archivo no permitida');
    }

    await fs.writeFile(fullFilePath, file.buffer);

    const publicUrl = buildPublicFileUrl(
      this.getPublicBaseUrl(),
      idRegistro,
      idTipoFoto,
      fileName,
    );

    return {
      fileName,
      absolutePath: fullFilePath,
      publicUrl,
    };
  }

  async cleanup(absolutePaths: string[]): Promise<void> {
    const dirs = new Set<string>();
    for (const abs of absolutePaths) {
      try {
        await fs.unlink(abs);
        dirs.add(path.dirname(abs));
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as { code?: string }).code
            : undefined;
        if (code !== 'ENOENT') {
          this.logger.warn(
            `No se pudo eliminar archivo temporal: ${err instanceof Error ? err.message : String(err)
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
      if (resolved === base || !resolved.startsWith(base + path.sep)) {
        return;
      }
      await fs.rmdir(resolved);
    } catch {
      // ignorar
    }
  }
}
