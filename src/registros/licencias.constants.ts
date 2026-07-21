/** Fotografías de Licencias (funcionamiento) → IdTipoFoto fijo. */
export const LICENCIAS_TIPO_FOTO = {
  licenciaFuncionamiento: 1,
  fachada: 6,
  estacionamiento: 7,
  bodega: 8,
} as const;

export type LicenciasFotoKey = keyof typeof LICENCIAS_TIPO_FOTO;

export const LICENCIAS_FILE_FIELD_NAMES = {
  licenciaFuncionamiento: 'Licencias.licenciaFuncionamiento',
  bodega: 'Licencias.bodega',
  fachada: 'Licencias.fachada',
  estacionamiento: 'Licencias.estacionamiento',
} as const;

export const LICENCIAS_FILE_FORM_TO_KEY: Record<string, LicenciasFotoKey> = {
  [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]:
    'licenciaFuncionamiento',
  [LICENCIAS_FILE_FIELD_NAMES.bodega]: 'bodega',
  [LICENCIAS_FILE_FIELD_NAMES.fachada]: 'fachada',
  [LICENCIAS_FILE_FIELD_NAMES.estacionamiento]: 'estacionamiento',
};

/**
 * Archivos de Licencias transversales al flujo PredioObra:
 * se procesan siempre (0 o 1) y se guardan en Fotos (tipos 6, 7 y 8).
 * licenciaFuncionamiento NO es transversal: solo PredioObra = 0.
 */
export const LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES = new Set<string>([
  LICENCIAS_FILE_FIELD_NAMES.fachada,
  LICENCIAS_FILE_FIELD_NAMES.estacionamiento,
  LICENCIAS_FILE_FIELD_NAMES.bodega,
]);

export const LICENCIAS_TRANSVERSAL_FOTO_KEYS = new Set<LicenciasFotoKey>([
  'fachada',
  'estacionamiento',
  'bodega',
]);

export const LICENCIAS_SCALAR_ATTRS = new Set([
  'Registro',
  'NombreComercial',
  'Giro',
  'LicenciaSuelo',
  'NombrePropietario',
  'ApellidoPaternoPropietario',
  'ApellidoMaternoPropietario',
  'TipoPersona',
  'RFC',
  'RazonSocial',
  'FechaExpedicion',
  'FechaRefrendo',
  'Estacionamiento',
  'Tipo',
  'FechaHora',
]);

export const CONTACTO_SCALAR_ATTRS = new Set([
  'Nombre',
  'ApellidoPaterno',
  'ApellidoMaterno',
  'Telefono',
  'Correo',
]);

export const CONTACTO_FORM_PREFIX = 'Licencias.Contacto.';

export const CONTACTO_REPRESENTANTE_SCALAR_ATTRS = new Set([
  'Nombre',
  'ApellidoPaterno',
  'ApellidoMaterno',
  'Telefono',
  'Correo',
]);

/** Debe evaluarse antes que CONTACTO_FORM_PREFIX (prefijo más específico). */
export const CONTACTO_REPRESENTANTE_FORM_PREFIX =
  'Licencias.ContactoRepresentante.';
