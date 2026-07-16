/**
 * Firmas de LicenciaConstruccion → IdTipoFoto fijo (no lo envía el cliente).
 */
export const FIRMA_TIPO_FOTO = {
  FirmaPropietario: 25,
  FirmaDRO: 26,
  FirmaCorresponsable: 27,
  FirmaResponsableRecepcionDocumento: 28,
} as const;

export type FirmaKey = keyof typeof FIRMA_TIPO_FOTO;

export const FIRMA_FIELD_NAMES = {
  FirmaPropietario: 'LicenciaConstruccion.FirmaPropietario',
  FirmaDRO: 'LicenciaConstruccion.FirmaDRO',
  FirmaCorresponsable: 'LicenciaConstruccion.FirmaCorresponsable',
  FirmaResponsableRecepcionDocumento:
    'LicenciaConstruccion.FirmaResponsableRecepcionDocumento',
} as const;

export const FIRMA_FORM_TO_KEY: Record<string, FirmaKey> = {
  [FIRMA_FIELD_NAMES.FirmaPropietario]: 'FirmaPropietario',
  [FIRMA_FIELD_NAMES.FirmaDRO]: 'FirmaDRO',
  [FIRMA_FIELD_NAMES.FirmaCorresponsable]: 'FirmaCorresponsable',
  [FIRMA_FIELD_NAMES.FirmaResponsableRecepcionDocumento]:
    'FirmaResponsableRecepcionDocumento',
};

/** Máximo de documentos por cada atributo múltiple de LicenciaConstruccion. */
export const MAX_DOCUMENTOS_POR_TIPO = 10;

/**
 * Documentos múltiples de LicenciaConstruccion → IdTipoFoto fijo.
 * Nombres exactos del formulario (case-sensitive).
 */
export const LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO = {
  constanciaAlineamientoyNumero: 10,
  LicenciaUsoyPlano: 11,
  ConstanciaPropietario: 14,
  Factibilidad: 15,
  RecibosImpuestoPredial: 16,
  JuegoDePlanosArquitectonicos: 17,
  otros: 18,
} as const;

export type LcDocumentoKey =
  keyof typeof LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO;

export const LC_DOCUMENTO_FIELD_NAMES = {
  constanciaAlineamientoyNumero:
    'LicenciaConstruccion.constanciaAlineamientoyNumero',
  LicenciaUsoyPlano: 'LicenciaConstruccion.LicenciaUsoyPlano',
  ConstanciaPropietario: 'LicenciaConstruccion.ConstanciaPropietario',
  Factibilidad: 'LicenciaConstruccion.Factibilidad',
  RecibosImpuestoPredial: 'LicenciaConstruccion.RecibosImpuestoPredial',
  JuegoDePlanosArquitectonicos:
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos',
  otros: 'LicenciaConstruccion.otros',
} as const;

export const LC_DOCUMENTO_FORM_TO_KEY: Record<string, LcDocumentoKey> = {
  [LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero]:
    'constanciaAlineamientoyNumero',
  [LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano]: 'LicenciaUsoyPlano',
  [LC_DOCUMENTO_FIELD_NAMES.ConstanciaPropietario]: 'ConstanciaPropietario',
  [LC_DOCUMENTO_FIELD_NAMES.Factibilidad]: 'Factibilidad',
  [LC_DOCUMENTO_FIELD_NAMES.RecibosImpuestoPredial]: 'RecibosImpuestoPredial',
  [LC_DOCUMENTO_FIELD_NAMES.JuegoDePlanosArquitectonicos]:
    'JuegoDePlanosArquitectonicos',
  [LC_DOCUMENTO_FIELD_NAMES.otros]: 'otros',
};

export const LC_DOCUMENTO_FIELDS = (
  Object.keys(LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO) as LcDocumentoKey[]
).map((key) => ({
  key,
  fieldName: LC_DOCUMENTO_FIELD_NAMES[key],
  idTipoFoto: LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO[key],
}));

/** MIME permitidos para firmas y documentos. */
export const FIRMA_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

export const FIRMA_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

export const FIRMA_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf']);

/** Atributos de texto/número de LicenciaConstruccion (form: LicenciaConstruccion.X). */
export const LC_SCALAR_ATTRS = new Set([
  'TipoSolicitudLicencia',
  'DescripcionProyecto',
  'SuperficieTerrenoM2',
  'SuperficieTerrenoObraM2',
  'DescripcionSistemaConstructivo',
  'NombrePropietario',
  'DomicilioNotificacion',
  'RFC',
  'NombreDRO',
  'NoRegLicenciaConstruccion',
  'CedulaProfesional',
  'Fecha',
  'NumeroExpediente',
  'NumeroControl',
  'SeguimientoObra',
  'ConstanciaAlineamiento',
  'LicenciaUsoSuelo',
  'PlanoAutorizado',
  'LicenciaFraccionamiento',
  'Escrituras',
  'FactibilidadAguaPotable',
  'RecibosPagoPredial',
  'RecibosMunicipales',
  'PlanoArquitectonicos',
  'Otros',
]);

export const CORRESPONSABLE_SCALAR_ATTRS = new Set([
  'NombreCompleto',
  'NoRegLicenciaConstruccion',
  'CedulaProfesional',
]);

/** LicenciaConstruccion.Corresponsables[0].NombreCompleto */
export const CORRESPONSABLES_INDEXED_RE =
  /^Corresponsables\[(\d+)\]\.([A-Za-z][A-Za-z0-9]*)$/;
