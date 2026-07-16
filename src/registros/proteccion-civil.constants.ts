export const PROTECCION_CIVIL_TIPO_FOTO = {
  vistoBueno: 9,
} as const;

export type ProteccionCivilFotoKey = keyof typeof PROTECCION_CIVIL_TIPO_FOTO;

export const PROTECCION_CIVIL_FILE_FIELD_NAMES = {
  vistoBueno: 'ProteccionCivil.vistoBueno',
} as const;

export const PROTECCION_CIVIL_FILE_FORM_TO_KEY: Record<
  string,
  ProteccionCivilFotoKey
> = {
  [PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno]: 'vistoBueno',
};

export const PROTECCION_CIVIL_SCALAR_ATTRS = new Set([
  'EsEmpresa',
  'RazonSocial',
  'RFC',
  'Nombre',
  'ApellidoPaterno',
  'ApellidoMaterno',
  'Telefono',
  'RegistroAcreditacion',
  'TienePrograma',
]);

export const CONTACTO_REPRESENTANTE_SCALAR_ATTRS = new Set([
  'Nombre',
  'ApellidoPaterno',
  'ApellidoMaterno',
  'Telefono',
  'Correo',
]);

export const CONTACTO_REPRESENTANTE_FORM_PREFIX =
  'ProteccionCivil.ContactoRepresentante.';
