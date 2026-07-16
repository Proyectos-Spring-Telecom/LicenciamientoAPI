/** Fotografías SAPAC → IdTipoFoto fijo, asignado exclusivamente por backend. */
export const SAPAC_TIPO_FOTO = {
  reciboSapac: 3,
  caratulamedidor: 4,
  cuadromedidor: 5,
} as const;

export type SapacFotoKey = keyof typeof SAPAC_TIPO_FOTO;

export const SAPAC_FILE_FIELD_NAMES = {
  reciboSapac: 'Sapac.reciboSapac',
  caratulamedidor: 'Sapac.caratulamedidor',
  cuadromedidor: 'Sapac.cuadromedidor',
} as const;

export const SAPAC_FILE_FORM_TO_KEY: Record<string, SapacFotoKey> = {
  [SAPAC_FILE_FIELD_NAMES.reciboSapac]: 'reciboSapac',
  [SAPAC_FILE_FIELD_NAMES.caratulamedidor]: 'caratulamedidor',
  [SAPAC_FILE_FIELD_NAMES.cuadromedidor]: 'cuadromedidor',
};

export const SAPAC_SCALAR_ATTRS = new Set([
  'NumeroCuenta',
  'Nombre',
  'ApellidoPaterno',
  'ApellidoMaterno',
  'RFC',
  'Sector',
  'Ruta',
  'Folio',
  'IdTipoServicio',
  'Medidor',
]);
