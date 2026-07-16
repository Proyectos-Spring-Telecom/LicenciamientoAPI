/** Fotografía Catastro → IdTipoFoto fijo, asignado exclusivamente por backend. */
export const CATASTRO_TIPO_FOTO = {
  reciboPredial: 2,
} as const;

export type CatastroFotoKey = keyof typeof CATASTRO_TIPO_FOTO;

export const CATASTRO_FILE_FIELD_NAMES = {
  reciboPredial: 'Catastro.reciboPredial',
} as const;

export const CATASTRO_FILE_FORM_TO_KEY: Record<string, CatastroFotoKey> = {
  [CATASTRO_FILE_FIELD_NAMES.reciboPredial]: 'reciboPredial',
};

export const CATASTRO_SCALAR_ATTRS = new Set([
  'Clave',
  'M2',
  'Superficie',
  'UsoSuelo',
]);

/**
 * Tipos de foto de FotosRegistros (Licencias + Catastro + SAPAC).
 * Conserva los IDs existentes.
 */
export const REGISTRO_TIPO_FOTO = {
  licenciaFuncionamiento: 1,
  reciboPredial: 2,
  reciboSapac: 3,
  caratulamedidor: 4,
  cuadromedidor: 5,
  fachada: 6,
  estacionamiento: 7,
  bodega: 8,
} as const;
