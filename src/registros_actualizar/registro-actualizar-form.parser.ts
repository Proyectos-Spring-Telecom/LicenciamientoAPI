import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CATASTRO_SCALAR_ATTRS,
} from 'src/registros/catastro.constants';
import {
  CORRESPONSABLE_SCALAR_ATTRS,
  CORRESPONSABLES_INDEXED_RE,
  LC_FILE_FIELD_NAMES,
  LC_SCALAR_ATTRS,
} from 'src/registros/licencia-construccion.constants';
import {
  CONTACTO_FORM_PREFIX,
  CONTACTO_REPRESENTANTE_FORM_PREFIX,
  CONTACTO_REPRESENTANTE_SCALAR_ATTRS,
  CONTACTO_SCALAR_ATTRS,
  LICENCIAS_SCALAR_ATTRS,
} from 'src/registros/licencias.constants';
import {
  PROTECCION_CIVIL_SCALAR_ATTRS,
} from 'src/registros/proteccion-civil.constants';
import { normalizePredioObra } from 'src/registros/licencia-construccion.sanitize';
import { SAPAC_SCALAR_ATTRS } from 'src/registros/sapac.constants';
import { ActualizarRegistroDto } from './dto/actualizar-registro.dto';
import {
  UpdateCatastroDto,
  UpdateContactoDto,
  UpdateContactoRepresentanteDto,
  UpdateLicenciasDto,
  UpdateProteccionCivilDto,
  UpdateSapacDto,
} from './dto/section-update.dto';
import { UpdateCorresponsableDto } from './dto/update-corresponsable.dto';
import { UpdateLicenciaConstruccionDto } from './dto/update-licencia-construccion.dto';
import {
  hasUsefulValues,
  tieneValorActualizable,
} from './registro-actualizar.util';

const ROOT_KEYS = new Set([
  'idRegistro',
  'Registro',
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

/** Alineado con POST: FechaHora es válido en Licencias, no en Sapac/Catastro/PC. */
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

/** En PATCH sí se permite Id para localizar; no IdLicenciaConstruccion. */
const FORBIDDEN_CORRESPONSABLE = new Set([
  'IdLicenciaConstruccion',
  'FechaCreacion',
  'FechaActualizacion',
]);

const CORRESPONSABLE_UPDATE_ATTRS = new Set([
  ...CORRESPONSABLE_SCALAR_ATTRS,
  'Id',
]);

const LC_FILE_FORM_KEYS = new Set<string>([
  ...Object.values(LC_FILE_FIELD_NAMES),
]);

/** Solo nombres exclusivos de archivo: no descartar del body los tinyint homónimos. */
const LC_FILE_ONLY_FORM_KEYS = new Set(
  [...LC_FILE_FORM_KEYS].filter(
    (name) =>
      !LC_SCALAR_ATTRS.has(name.slice('LicenciaConstruccion.'.length)),
  ),
);

export type ParsedRegistroActualizarForm = {
  registro: ActualizarRegistroDto;
  sapac?: UpdateSapacDto;
  catastro?: UpdateCatastroDto;
  licencias?: UpdateLicenciasDto;
  contacto?: UpdateContactoDto;
  proteccionCivil?: UpdateProteccionCivilDto;
  contactoRepresentante?: UpdateContactoRepresentanteDto;
  licenciaConstruccion?: UpdateLicenciaConstruccionDto;
  predioObraEfectivo: 0 | 1;
  hasRootUsefulFields: boolean;
  hasSapac: boolean;
  hasCatastro: boolean;
  hasLicencias: boolean;
  hasContacto: boolean;
  hasProteccionCivil: boolean;
  hasContactoRepresentante: boolean;
  hasLicenciaConstruccion: boolean;
  hasCorresponsables: boolean;
};

/**
 * Reconstruye DTOs desde multipart plano para PATCH /registros_actualizar.
 * Sanitiza secciones incompatibles con PredioObra efectivo (0 vs 1).
 */
export async function parseRegistroActualizarMultipart(
  body: Record<string, unknown>,
  predioObraEfectivo: 0 | 1,
): Promise<ParsedRegistroActualizarForm> {
  const rootRaw: Record<string, unknown> = {};
  const sapacRaw: Record<string, unknown> = {};
  const catastroRaw: Record<string, unknown> = {};
  const licenciaRaw: Record<string, unknown> = {};
  const contactoRaw: Record<string, unknown> = {};
  const proteccionCivilRaw: Record<string, unknown> = {};
  const contactoRepresentanteRaw: Record<string, unknown> = {};
  const lcRaw: Record<string, unknown> = {};
  const corresponsablesByIndex = new Map<number, Record<string, unknown>>();

  for (const [key, value] of Object.entries(body ?? {})) {
    if (value === undefined) continue;

    if (ROOT_KEYS.has(key)) {
      rootRaw[key] = value;
      continue;
    }

    if (LC_FILE_ONLY_FORM_KEYS.has(key)) {
      // Firmas/documentos exclusivos: etapa posterior; no error ni procesamiento.
      // LicenciaUsoSuelo/PlanoAutorizado/LicenciaFraccionamiento pueden venir
      // también como tinyint en el body y deben llegar al DTO.
      continue;
    }

    if (key.startsWith('LicenciaConstruccion.')) {
      if (predioObraEfectivo === 0) continue;

      const attr = key.slice('LicenciaConstruccion.'.length);
      if (
        attr === '__proto__' ||
        attr === 'prototype' ||
        attr === 'constructor' ||
        attr.includes('__proto__')
      ) {
        throw new BadRequestException(`Campo no permitido: "${key}"`);
      }

      const indexed = attr.match(CORRESPONSABLES_INDEXED_RE);
      if (indexed) {
        const index = Number(indexed[1]);
        const field = indexed[2];
        if (FORBIDDEN_CORRESPONSABLE.has(field)) {
          throw new BadRequestException(
            `El campo "${key}" no puede enviarse desde el cliente`,
          );
        }
        if (!CORRESPONSABLE_UPDATE_ATTRS.has(field)) {
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
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice('Sapac.'.length);
      assertAttrAllowed(key, attr, SAPAC_SCALAR_ATTRS, FORBIDDEN_SAPAC);
      sapacRaw[attr] = value;
      continue;
    }

    if (key.startsWith('Catastro.')) {
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice('Catastro.'.length);
      assertAttrAllowed(key, attr, CATASTRO_SCALAR_ATTRS, FORBIDDEN_CATASTRO);
      catastroRaw[attr] = value;
      continue;
    }

    if (key.startsWith(CONTACTO_REPRESENTANTE_FORM_PREFIX)) {
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice(CONTACTO_REPRESENTANTE_FORM_PREFIX.length);
      assertAttrAllowed(
        key,
        attr,
        CONTACTO_REPRESENTANTE_SCALAR_ATTRS,
        FORBIDDEN_CONTACTO_REPRESENTANTE,
      );
      contactoRepresentanteRaw[attr] = value;
      continue;
    }

    if (key.startsWith(CONTACTO_FORM_PREFIX)) {
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice(CONTACTO_FORM_PREFIX.length);
      assertAttrAllowed(key, attr, CONTACTO_SCALAR_ATTRS, FORBIDDEN_CONTACTO);
      contactoRaw[attr] = value;
      continue;
    }

    if (key.startsWith('Licencias.')) {
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice('Licencias.'.length);
      if (
        attr === 'Contacto' ||
        attr.startsWith('Contacto.') ||
        attr === 'ContactoRepresentante' ||
        attr.startsWith('ContactoRepresentante.')
      ) {
        continue;
      }
      assertAttrAllowed(key, attr, LICENCIAS_SCALAR_ATTRS, FORBIDDEN_LICENCIAS);
      licenciaRaw[attr] = value;
      continue;
    }

    if (key.startsWith('ProteccionCivil.')) {
      if (predioObraEfectivo === 1) continue;
      const attr = key.slice('ProteccionCivil.'.length);
      assertAttrAllowed(
        key,
        attr,
        PROTECCION_CIVIL_SCALAR_ATTRS,
        FORBIDDEN_PROTECCION_CIVIL,
      );
      proteccionCivilRaw[attr] = value;
      continue;
    }

    throw new BadRequestException(`Campo no reconocido: "${key}"`);
  }

  const registro = plainToInstance(ActualizarRegistroDto, rootRaw);
  await assertValid(registro);

  let sapac: UpdateSapacDto | undefined;
  let catastro: UpdateCatastroDto | undefined;
  let licencias: UpdateLicenciasDto | undefined;
  let contacto: UpdateContactoDto | undefined;
  let proteccionCivil: UpdateProteccionCivilDto | undefined;
  let contactoRepresentante: UpdateContactoRepresentanteDto | undefined;
  let licenciaConstruccion: UpdateLicenciaConstruccionDto | undefined;

  if (predioObraEfectivo === 0) {
    if (Object.keys(sapacRaw).length) {
      sapac = plainToInstance(UpdateSapacDto, sapacRaw);
      await assertValid(sapac);
    }
    if (Object.keys(catastroRaw).length) {
      catastro = plainToInstance(UpdateCatastroDto, catastroRaw);
      await assertValid(catastro);
    }
    if (Object.keys(licenciaRaw).length) {
      licencias = plainToInstance(UpdateLicenciasDto, licenciaRaw);
      await assertValid(licencias);
    }
    if (Object.keys(contactoRaw).length) {
      contacto = plainToInstance(UpdateContactoDto, contactoRaw);
      await assertValid(contacto);
    }
    if (Object.keys(proteccionCivilRaw).length) {
      proteccionCivil = plainToInstance(
        UpdateProteccionCivilDto,
        proteccionCivilRaw,
      );
      await assertValid(proteccionCivil);
    }
    if (Object.keys(contactoRepresentanteRaw).length) {
      contactoRepresentante = plainToInstance(
        UpdateContactoRepresentanteDto,
        contactoRepresentanteRaw,
      );
      await assertValid(contactoRepresentante);
    }
  }

  if (predioObraEfectivo === 1) {
    const hasLcScalars = Object.keys(lcRaw).length > 0;
    const hasCorrIndexes = corresponsablesByIndex.size > 0;
    if (hasLcScalars || hasCorrIndexes) {
      if (hasCorrIndexes) {
        lcRaw.Corresponsables = [...corresponsablesByIndex.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, raw]) => raw);
      }
      licenciaConstruccion = plainToInstance(
        UpdateLicenciaConstruccionDto,
        lcRaw,
      );
      await assertValid(licenciaConstruccion);
    }
  }

  const rootUsefulKeys = [
    'Registro',
    'Latitud',
    'Longitud',
    'EntidadFederativa',
    'Municipio',
    'Localidad',
    'Colonia',
    'Calle',
    'NoInterior',
    'NoExterior',
    'CP',
    'TipoRegistro',
    'PredioObra',
  ] as const;

  const hasRootUsefulFields = rootUsefulKeys.some((k) =>
    tieneValorEnDto(registro[k]),
  );

  const { Corresponsables: corrDto, ...lcScalars } =
    licenciaConstruccion ?? {};

  const hasLicenciaConstruccion = hasUsefulValues(lcScalars);
  const hasCorresponsables = (corrDto ?? []).some((item) =>
    hasCorresponsableUsefulFields(item),
  );

  return {
    registro,
    sapac,
    catastro,
    licencias,
    contacto,
    proteccionCivil,
    contactoRepresentante,
    licenciaConstruccion,
    predioObraEfectivo,
    hasRootUsefulFields,
    hasSapac: hasUsefulValues(sapac),
    hasCatastro: hasUsefulValues(catastro),
    hasLicencias: hasUsefulValues(licencias),
    hasContacto: hasUsefulValues(contacto),
    hasProteccionCivil: hasUsefulValues(proteccionCivil),
    hasContactoRepresentante: hasUsefulValues(contactoRepresentante),
    hasLicenciaConstruccion,
    hasCorresponsables,
  };
}

export function hasCorresponsableUsefulFields(
  item: UpdateCorresponsableDto | Record<string, unknown>,
): boolean {
  return (
    tieneValorActualizable(
      (item as UpdateCorresponsableDto).NombreCompleto,
    ) ||
    tieneValorActualizable(
      (item as UpdateCorresponsableDto).NoRegLicenciaConstruccion,
    ) ||
    tieneValorActualizable(
      (item as UpdateCorresponsableDto).CedulaProfesional,
    )
  );
}

/** Peek idRegistro y PredioObra crudo antes de cargar el registro. */
export function peekIdRegistro(body: Record<string, unknown>): number {
  const raw = body?.idRegistro;
  if (raw === undefined || raw === null || raw === '') {
    throw new BadRequestException('idRegistro es obligatorio');
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new BadRequestException('idRegistro debe ser un entero positivo');
    }
    const n = Number.parseInt(trimmed, 10);
    if (n < 1) {
      throw new BadRequestException('idRegistro debe ser mayor o igual a 1');
    }
    return n;
  }
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) {
    return raw;
  }
  throw new BadRequestException('idRegistro debe ser un entero positivo');
}

export function peekPredioObraFromBody(
  body: Record<string, unknown>,
): 0 | 1 | undefined {
  const raw = body?.PredioObra;
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (raw === '0' || raw === 0) return 0;
  if (raw === '1' || raw === 1) return 1;
  return normalizePredioObra(raw);
}

function tieneValorEnDto(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function assertAttrAllowed(
  key: string,
  attr: string,
  allowed: Set<string>,
  forbidden: Set<string>,
): void {
  if (
    attr === '__proto__' ||
    attr === 'prototype' ||
    attr === 'constructor'
  ) {
    throw new BadRequestException(
      `El campo "${key}" no puede enviarse desde el cliente`,
    );
  }
  if (forbidden.has(attr)) {
    throw new BadRequestException(
      `El campo "${key}" no puede enviarse desde el cliente`,
    );
  }
  if (!allowed.has(attr)) {
    throw new BadRequestException(`Campo no reconocido: "${key}"`);
  }
}

async function assertValid(dto: object): Promise<void> {
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) {
    throw new BadRequestException(flattenErrors(errors));
  }
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
