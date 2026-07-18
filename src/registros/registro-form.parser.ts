import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCatastroDto } from './dto/create-catastro.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { CreateContactoRepresentanteDto } from './dto/create-contacto-representante.dto';
import { CreateLicenciaDto } from './dto/create-licencia.dto';
import { CreateLicenciaConstruccionDto } from './dto/create-licencia-construccion.dto';
import { CreateProteccionCivilDto } from './dto/create-proteccion-civil.dto';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { CreateSapacDto } from './dto/create-sapac.dto';
import {
  CATASTRO_FILE_FIELD_NAMES,
  CATASTRO_FILE_FORM_TO_KEY,
  CATASTRO_SCALAR_ATTRS,
  CatastroFotoKey,
} from './catastro.constants';
import {
  CORRESPONSABLE_SCALAR_ATTRS,
  CORRESPONSABLES_INDEXED_RE,
  LC_FILE_FIELD_NAMES,
  LC_FILE_FORM_TO_KEY,
  LC_SCALAR_ATTRS,
  LcFileKey,
} from './licencia-construccion.constants';
import {
  normalizePredioObra,
  sanitizeFieldsByPredioObra,
  sanitizeMultipartFiles,
} from './licencia-construccion.sanitize';
import { LcFiles } from './licencia-construccion-storage.service';
import {
  CONTACTO_FORM_PREFIX,
  CONTACTO_SCALAR_ATTRS,
  LICENCIAS_FILE_FIELD_NAMES,
  LICENCIAS_FILE_FORM_TO_KEY,
  LICENCIAS_SCALAR_ATTRS,
  LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES,
  LicenciasFotoKey,
} from './licencias.constants';
import {
  CONTACTO_REPRESENTANTE_FORM_PREFIX,
  CONTACTO_REPRESENTANTE_SCALAR_ATTRS,
  PROTECCION_CIVIL_FILE_FIELD_NAMES,
  PROTECCION_CIVIL_FILE_FORM_TO_KEY,
  PROTECCION_CIVIL_SCALAR_ATTRS,
  ProteccionCivilFotoKey,
} from './proteccion-civil.constants';
import {
  SAPAC_FILE_FIELD_NAMES,
  SAPAC_FILE_FORM_TO_KEY,
  SAPAC_SCALAR_ATTRS,
  SapacFotoKey,
} from './sapac.constants';
import { SapacFotoFiles } from './sapac-storage.service';

export type CatastroFotoFiles = Partial<
  Record<CatastroFotoKey, Express.Multer.File>
>;

export type LicenciasFotoFiles = Partial<
  Record<LicenciasFotoKey, Express.Multer.File>
>;

export type ProteccionCivilFotoFiles = Partial<
  Record<ProteccionCivilFotoKey, Express.Multer.File>
>;

export interface ParsedRegistroForm {
  registro: CreateRegistroDto;
  licenciaConstruccion?: CreateLicenciaConstruccionDto;
  sapac?: CreateSapacDto;
  catastro?: CreateCatastroDto;
  licencia?: CreateLicenciaDto;
  contacto?: CreateContactoDto;
  proteccionCivil?: CreateProteccionCivilDto;
  contactoRepresentante?: CreateContactoRepresentanteDto;
  archivosLc: LcFiles;
  fotosSapac: SapacFotoFiles;
  fotosCatastro: CatastroFotoFiles;
  fotosLicencias: LicenciasFotoFiles;
  fotosProteccionCivil: ProteccionCivilFotoFiles;
  crearLicenciaConstruccion: boolean;
  crearSapac: boolean;
  crearCatastro: boolean;
  crearLicencia: boolean;
  crearProteccionCivil: boolean;
}

const ROOT_KEYS = new Set([
  'Latitud',
  'Longitud',
  'TipoRegistro',
  'PredioObra',
  'EntidadFederativa',
  'Municipio',
  'Localidad',
  'Colonia',
  'Calle',
  'NoInterior',
  'NoExterior',
  'CP',
]);

const FORBIDDEN_LC = new Set([
  'Id',
  'IdRegistro',
  'FechaCreacion',
  'FechaActualizacion',
  'FirmaPropietario',
  'FirmaDRO',
  'FirmaCorresponsable',
  'FirmaResponsableRecepcionDocumento',
  'IdTipoFoto',
  'IdLicenciaConstruccion',
  'Ruta',
  'FechaHora',
  'Corresponsables',
]);

const FORBIDDEN_CORRESPONSABLE = new Set([
  'Id',
  'IdLicenciaConstruccion',
  'FechaCreacion',
  'FechaActualizacion',
]);

const DANGEROUS_ATTR_NAMES = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

const FORBIDDEN_SAPAC = new Set([
  'Id',
  'IdRegistro',
  'FechaCreacion',
  'FechaActualizacion',
  'IdTipoFoto',
  'FechaHora',
]);

const FORBIDDEN_CATASTRO = new Set([
  'Id',
  'IdRegistro',
  'FechaCreacion',
  'FechaActualizacion',
  'IdTipoFoto',
  'FechaHora',
  'Ruta',
]);

const FORBIDDEN_LICENCIAS = new Set([
  'Id',
  'IdRegistro',
  'FechaCreacion',
  'FechaActualizacion',
  'IdTipoFoto',
  'Ruta',
  'RazonSocial',
  'Estatus',
]);

const FORBIDDEN_CONTACTO = new Set(['Id', 'IdRegistro']);
const FORBIDDEN_PROTECCION_CIVIL = new Set([
  'Id',
  'IdRegistro',
  'IdTipoFoto',
  'Ruta',
  'FechaHora',
]);
const FORBIDDEN_CONTACTO_REPRESENTANTE = new Set(['Id', 'IdRegistro']);

/**
 * Reconstruye DTOs desde campos planos multipart.
 * Primero sanitiza las secciones según PredioObra (campos vacíos del front).
 */
export async function parseRegistroMultipart(
  body: Record<string, unknown>,
  uploaded: Record<string, Express.Multer.File[] | undefined>,
): Promise<ParsedRegistroForm> {
  const predioObra = normalizePredioObra(body?.PredioObra);
  const sanitizedBody = sanitizeFieldsByPredioObra(body ?? {}, predioObra);
  const sanitizedFiles = sanitizeMultipartFiles(uploaded, predioObra);

  const lcFileFieldNames = new Set(
    Object.values(LC_FILE_FIELD_NAMES) as string[],
  );
  // Nombres que solo existen como archivo: si además son atributo escalar
  // (LicenciaUsoSuelo/PlanoAutorizado/LicenciaFraccionamiento tinyint), el
  // valor textual del body debe seguir llegando al DTO, no descartarse.
  const lcFileOnlyFieldNames = new Set(
    [...lcFileFieldNames].filter(
      (name) =>
        !LC_SCALAR_ATTRS.has(name.slice('LicenciaConstruccion.'.length)),
    ),
  );
  const sapacFileFieldNames = new Set(
    Object.values(SAPAC_FILE_FIELD_NAMES) as string[],
  );
  const catastroFileFieldNames = new Set(
    Object.values(CATASTRO_FILE_FIELD_NAMES) as string[],
  );
  const licenciasFileFieldNames = new Set(
    Object.values(LICENCIAS_FILE_FIELD_NAMES) as string[],
  );
  const proteccionCivilFileFieldNames = new Set(
    Object.values(PROTECCION_CIVIL_FILE_FIELD_NAMES) as string[],
  );

  if (
    predioObra === 0 &&
    Object.entries(sanitizedFiles).some(
      ([key, files]) => lcFileFieldNames.has(key) && files.length > 0,
    )
  ) {
    throw new BadRequestException(
      'No se pueden registrar archivos de LicenciaConstruccion cuando PredioObra es 0.',
    );
  }
  if (
    predioObra === 1 &&
    Object.entries(sanitizedFiles).some(
      ([key, files]) => sapacFileFieldNames.has(key) && files.length > 0,
    )
  ) {
    throw new BadRequestException(
      'No se pueden registrar fotografías de SAPAC cuando PredioObra es 1.',
    );
  }
  if (
    predioObra === 1 &&
    Object.entries(sanitizedFiles).some(
      ([key, files]) => catastroFileFieldNames.has(key) && files.length > 0,
    )
  ) {
    throw new BadRequestException(
      'No se pueden registrar fotografías de Catastro cuando PredioObra es 1.',
    );
  }
  // fachada/estacionamiento/bodega son transversales: válidos en ambos flujos.
  if (
    predioObra === 1 &&
    Object.entries(sanitizedFiles).some(
      ([key, files]) =>
        licenciasFileFieldNames.has(key) &&
        !LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES.has(key) &&
        files.length > 0,
    )
  ) {
    throw new BadRequestException(
      'No se pueden registrar fotografías de Licencias cuando PredioObra es 1.',
    );
  }
  if (
    predioObra === 1 &&
    Object.entries(sanitizedFiles).some(
      ([key, files]) => proteccionCivilFileFieldNames.has(key) && files.length > 0,
    )
  ) {
    throw new BadRequestException(
      'No se pueden registrar fotografías de ProteccionCivil cuando PredioObra es 1.',
    );
  }

  const rootRaw: Record<string, unknown> = {};
  const lcRaw: Record<string, unknown> = {};
  const corresponsablesByIndex = new Map<number, Record<string, unknown>>();
  const sapacRaw: Record<string, unknown> = {};
  const catastroRaw: Record<string, unknown> = {};
  const licenciaRaw: Record<string, unknown> = {};
  const contactoRaw: Record<string, unknown> = {};
  const proteccionCivilRaw: Record<string, unknown> = {};
  const contactoRepresentanteRaw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(sanitizedBody)) {
    if (value === undefined) continue;

    if (
      lcFileOnlyFieldNames.has(key) ||
      sapacFileFieldNames.has(key) ||
      catastroFileFieldNames.has(key) ||
      licenciasFileFieldNames.has(key) ||
      proteccionCivilFileFieldNames.has(key)
    ) {
      continue;
    }

    if (ROOT_KEYS.has(key)) {
      rootRaw[key] = value;
      continue;
    }

    if (key.startsWith('LicenciaConstruccion.')) {
      if (predioObra === 0) continue;

      const attr = key.slice('LicenciaConstruccion.'.length);
      if (DANGEROUS_ATTR_NAMES.has(attr) || attr.includes('__proto__')) {
        throw new BadRequestException(`Campo no permitido: "${key}"`);
      }

      const indexed = attr.match(CORRESPONSABLES_INDEXED_RE);
      if (indexed) {
        const index = Number(indexed[1]);
        const field = indexed[2];
        if (DANGEROUS_ATTR_NAMES.has(field)) {
          throw new BadRequestException(`Campo no permitido: "${key}"`);
        }
        if (FORBIDDEN_CORRESPONSABLE.has(field)) {
          throw new BadRequestException(
            `El campo "${key}" no puede enviarse desde el cliente`,
          );
        }
        if (!CORRESPONSABLE_SCALAR_ATTRS.has(field)) {
          throw new BadRequestException(`Campo no reconocido: "${key}"`);
        }
        const current = corresponsablesByIndex.get(index) ?? {};
        current[field] = value;
        corresponsablesByIndex.set(index, current);
        continue;
      }

      if (attr === 'Corresponsables' || attr.startsWith('Corresponsables.')) {
        throw new BadRequestException(
          `Campo no reconocido: "${key}". Use LicenciaConstruccion.Corresponsables[i].Atributo`,
        );
      }

      if (FORBIDDEN_LC.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!LC_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      lcRaw[attr] = value;
      continue;
    }

    if (key.startsWith('Sapac.')) {
      if (predioObra === 1) continue;

      const attr = key.slice('Sapac.'.length);
      if (FORBIDDEN_SAPAC.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!SAPAC_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      sapacRaw[attr] = value;
      continue;
    }

    if (key.startsWith('Catastro.')) {
      if (predioObra === 1) continue;

      const attr = key.slice('Catastro.'.length);
      if (FORBIDDEN_CATASTRO.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!CATASTRO_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      catastroRaw[attr] = value;
      continue;
    }

    if (key.startsWith(CONTACTO_FORM_PREFIX)) {
      if (predioObra === 1) continue;

      const attr = key.slice(CONTACTO_FORM_PREFIX.length);
      if (FORBIDDEN_CONTACTO.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!CONTACTO_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      contactoRaw[attr] = value;
      continue;
    }

    if (key.startsWith('Licencias.')) {
      if (predioObra === 1) continue;

      const attr = key.slice('Licencias.'.length);
      if (attr === 'Contacto' || attr.startsWith('Contacto.')) {
        continue;
      }
      if (FORBIDDEN_LICENCIAS.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!LICENCIAS_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      licenciaRaw[attr] = value;
      continue;
    }

    if (key.startsWith(CONTACTO_REPRESENTANTE_FORM_PREFIX)) {
      if (predioObra === 1) continue;

      const attr = key.slice(CONTACTO_REPRESENTANTE_FORM_PREFIX.length);
      if (FORBIDDEN_CONTACTO_REPRESENTANTE.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!CONTACTO_REPRESENTANTE_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      contactoRepresentanteRaw[attr] = value;
      continue;
    }

    if (key.startsWith('ProteccionCivil.')) {
      if (predioObra === 1) continue;

      const attr = key.slice('ProteccionCivil.'.length);
      if (
        attr === 'ContactoRepresentante' ||
        attr.startsWith('ContactoRepresentante.')
      ) {
        continue;
      }
      if (FORBIDDEN_PROTECCION_CIVIL.has(attr)) {
        throw new BadRequestException(
          `El campo "${key}" no puede enviarse desde el cliente`,
        );
      }
      if (!PROTECCION_CIVIL_SCALAR_ATTRS.has(attr)) {
        throw new BadRequestException(`Campo no reconocido: "${key}"`);
      }
      proteccionCivilRaw[attr] = value;
      continue;
    }

    throw new BadRequestException(`Campo no reconocido: "${key}"`);
  }

  const archivosLc: LcFiles = {};
  const fotosSapac: SapacFotoFiles = {};
  const fotosCatastro: CatastroFotoFiles = {};
  const fotosLicencias: LicenciasFotoFiles = {};
  const fotosProteccionCivil: ProteccionCivilFotoFiles = {};
  for (const [formName, files] of Object.entries(sanitizedFiles)) {
    const lcFileKey = LC_FILE_FORM_TO_KEY[formName];
    const sapacFotoKey = SAPAC_FILE_FORM_TO_KEY[formName];
    const catastroFotoKey = CATASTRO_FILE_FORM_TO_KEY[formName];
    const licenciasFotoKey = LICENCIAS_FILE_FORM_TO_KEY[formName];
    const proteccionCivilFotoKey = PROTECCION_CIVIL_FILE_FORM_TO_KEY[formName];
    if (
      !lcFileKey &&
      !sapacFotoKey &&
      !catastroFotoKey &&
      !licenciasFotoKey &&
      !proteccionCivilFotoKey
    ) {
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
    if (lcFileKey) {
      archivosLc[lcFileKey as LcFileKey] = files[0];
    } else if (sapacFotoKey) {
      fotosSapac[sapacFotoKey as SapacFotoKey] = files[0];
    } else if (catastroFotoKey) {
      fotosCatastro[catastroFotoKey as CatastroFotoKey] = files[0];
    } else if (licenciasFotoKey) {
      fotosLicencias[licenciasFotoKey as LicenciasFotoKey] = files[0];
    } else {
      fotosProteccionCivil[proteccionCivilFotoKey as ProteccionCivilFotoKey] =
        files[0];
    }
  }

  const registro = plainToInstance(CreateRegistroDto, rootRaw);
  const registroErrors = await validate(registro, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (registroErrors.length) {
    throw new BadRequestException(flattenErrors(registroErrors));
  }

  const crearLicenciaConstruccion = registro.PredioObra === 1;
  const crearSapac = registro.PredioObra === 0;
  const crearCatastro = registro.PredioObra === 0;
  const crearLicencia = registro.PredioObra === 0;
  const crearProteccionCivil = registro.PredioObra === 0;

  let licenciaConstruccion: CreateLicenciaConstruccionDto | undefined;
  if (crearLicenciaConstruccion) {
    if (corresponsablesByIndex.size > 0) {
      lcRaw.Corresponsables = [...corresponsablesByIndex.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, item]) => item);
    }

    licenciaConstruccion = plainToInstance(
      CreateLicenciaConstruccionDto,
      lcRaw,
    );
    const lcErrors = await validate(licenciaConstruccion, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (lcErrors.length) {
      throw new BadRequestException(flattenErrors(lcErrors));
    }
  }

  let sapac: CreateSapacDto | undefined;
  if (crearSapac) {
    sapac = plainToInstance(CreateSapacDto, sapacRaw);
    const sapacErrors = await validate(sapac, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (sapacErrors.length) {
      throw new BadRequestException(flattenErrors(sapacErrors));
    }
  }

  let catastro: CreateCatastroDto | undefined;
  if (crearCatastro) {
    catastro = plainToInstance(CreateCatastroDto, catastroRaw);
    const catastroErrors = await validate(catastro, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (catastroErrors.length) {
      throw new BadRequestException(flattenErrors(catastroErrors));
    }
  }

  let licencia: CreateLicenciaDto | undefined;
  let contacto: CreateContactoDto | undefined;
  if (crearLicencia) {
    licencia = plainToInstance(CreateLicenciaDto, licenciaRaw);
    const licenciaErrors = await validate(licencia, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (licenciaErrors.length) {
      throw new BadRequestException(flattenErrors(licenciaErrors));
    }

    if (Object.keys(contactoRaw).length) {
      contacto = plainToInstance(CreateContactoDto, contactoRaw);
      const contactoErrors = await validate(contacto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (contactoErrors.length) {
        throw new BadRequestException(flattenErrors(contactoErrors));
      }
    }
  }

  let proteccionCivil: CreateProteccionCivilDto | undefined;
  let contactoRepresentante: CreateContactoRepresentanteDto | undefined;
  if (crearProteccionCivil) {
    proteccionCivil = plainToInstance(
      CreateProteccionCivilDto,
      proteccionCivilRaw,
    );
    const proteccionCivilErrors = await validate(proteccionCivil, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (proteccionCivilErrors.length) {
      throw new BadRequestException(flattenErrors(proteccionCivilErrors));
    }

    if (Object.keys(contactoRepresentanteRaw).length) {
      contactoRepresentante = plainToInstance(
        CreateContactoRepresentanteDto,
        contactoRepresentanteRaw,
      );
      const contactoRepresentanteErrors = await validate(
        contactoRepresentante,
        {
          whitelist: true,
          forbidNonWhitelisted: true,
        },
      );
      if (contactoRepresentanteErrors.length) {
        throw new BadRequestException(
          flattenErrors(contactoRepresentanteErrors),
        );
      }
    }
  }

  return {
    registro,
    licenciaConstruccion,
    sapac,
    catastro,
    licencia,
    contacto,
    proteccionCivil,
    contactoRepresentante,
    archivosLc,
    fotosSapac,
    fotosCatastro,
    fotosLicencias,
    fotosProteccionCivil,
    crearLicenciaConstruccion,
    crearSapac,
    crearCatastro,
    crearLicencia,
    crearProteccionCivil,
  };
}

function flattenErrors(
  errors: {
    constraints?: Record<string, string>;
    children?: unknown[];
  }[],
): string[] | string {
  const collect = (
    items: {
      constraints?: Record<string, string>;
      children?: unknown[];
    }[],
  ): string[] =>
    items.flatMap((e) => {
      const own = Object.values(e.constraints ?? {});
      const children = Array.isArray(e.children)
        ? collect(e.children as typeof items)
        : [];
      return [...own, ...children];
    });

  const messages = collect(errors);
  return messages.length ? messages : 'Validación fallida';
}
