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
