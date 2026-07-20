/**
 * Archivos de LicenciaConstruccion en POST /registros (fuente única de verdad).
 * Cada campo multipart acepta máximo 1 archivo y genera una fila en
 * FotosLicenciaConstruccion con el IdTipoFoto indicado.
 */
export const LC_FILE_TIPO_FOTO = {
  constanciaAlineamiento: 10,
  constanciaNumero: 29,
  LicenciaUsoSuelo: 11,
  PlanoAutorizado: 12,
  LicenciaFraccionamiento: 13,
  ConstanciaPropietario: 14,
  Factibilidad: 15,
  RecibosImpuestoPredial: 16,
  JuegoDePlanosArquitectonicos1: 17,
  JuegoDePlanosArquitectonicos2: 31,
  JuegoDePlanosArquitectonicos3: 32,
  otros: 18,
  FirmaPropietario: 25,
  FirmaDRO: 26,
  FirmaCorresponsable: 27,
  FirmaResponsableRecepcionDocumento: 28,
} as const;

export type LcFileKey = keyof typeof LC_FILE_TIPO_FOTO;

export const LC_FILE_KEYS = Object.keys(LC_FILE_TIPO_FOTO) as LcFileKey[];

/** Nombre multipart completo → IdTipoFoto (POST /registros). */
export const LICENCIA_CONSTRUCCION_FILE_TYPE_MAP: Record<string, number> =
  Object.fromEntries(
    LC_FILE_KEYS.map((key) => [
      `LicenciaConstruccion.${key}`,
      LC_FILE_TIPO_FOTO[key],
    ]),
  );

/** Clave interna → nombre multipart completo (POST /registros). */
export const LC_FILE_FIELD_NAMES: Record<LcFileKey, string> =
  Object.fromEntries(
    LC_FILE_KEYS.map((key) => [key, `LicenciaConstruccion.${key}`]),
  ) as Record<LcFileKey, string>;

/** Nombre multipart completo → clave interna (POST /registros). */
export const LC_FILE_FORM_TO_KEY: Record<string, LcFileKey> =
  Object.fromEntries(
    LC_FILE_KEYS.map((key) => [`LicenciaConstruccion.${key}`, key]),
  );

/**
 * Salida nominal de fotos de LicenciaConstruccion en los GET de detalle
 * (GET /registros/:idRegistro y GET /monitoreo/:idRegistro).
 * Derivado de LC_FILE_TIPO_FOTO (fuente única de IdTipoFoto).
 *
 * licenciaUsoSuelo, planoAutorizado y licenciaFraccionamiento se exponen en
 * camelCase porque los nombres PascalCase ya pertenecen a los indicadores
 * tinyint de la tabla LicenciaConstruccion en la misma respuesta (misma
 * convención dato/archivo que Estacionamiento/estacionamiento en Licencias).
 */
export const LC_RESPONSE_PHOTO_MAP = {
  constanciaAlineamiento: LC_FILE_TIPO_FOTO.constanciaAlineamiento,
  constanciaNumero: LC_FILE_TIPO_FOTO.constanciaNumero,
  licenciaUsoSuelo: LC_FILE_TIPO_FOTO.LicenciaUsoSuelo,
  planoAutorizado: LC_FILE_TIPO_FOTO.PlanoAutorizado,
  licenciaFraccionamiento: LC_FILE_TIPO_FOTO.LicenciaFraccionamiento,
  ConstanciaPropietario: LC_FILE_TIPO_FOTO.ConstanciaPropietario,
  Factibilidad: LC_FILE_TIPO_FOTO.Factibilidad,
  RecibosImpuestoPredial: LC_FILE_TIPO_FOTO.RecibosImpuestoPredial,
  JuegoDePlanosArquitectonicos1: LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos1,
  JuegoDePlanosArquitectonicos2: LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos2,
  JuegoDePlanosArquitectonicos3: LC_FILE_TIPO_FOTO.JuegoDePlanosArquitectonicos3,
  otros: LC_FILE_TIPO_FOTO.otros,
  FirmaPropietario: LC_FILE_TIPO_FOTO.FirmaPropietario,
  FirmaDRO: LC_FILE_TIPO_FOTO.FirmaDRO,
  FirmaCorresponsable: LC_FILE_TIPO_FOTO.FirmaCorresponsable,
  FirmaResponsableRecepcionDocumento:
    LC_FILE_TIPO_FOTO.FirmaResponsableRecepcionDocumento,
} as const;

export type LcResponsePhotoKey = keyof typeof LC_RESPONSE_PHOTO_MAP;

export const LC_RESPONSE_PHOTO_KEYS = Object.keys(
  LC_RESPONSE_PHOTO_MAP,
) as LcResponsePhotoKey[];

/**
 * Firmas de LicenciaConstruccion → IdTipoFoto fijo (no lo envía el cliente).
 * Uso exclusivo de PATCH /registros_actualizar (el POST usa LC_FILE_TIPO_FOTO).
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

/**
 * Máximo de documentos por cada atributo múltiple de LicenciaConstruccion.
 * Uso exclusivo de PATCH /registros_actualizar (el POST ahora usa maxCount 1).
 */
export const MAX_DOCUMENTOS_POR_TIPO = 10;

/**
 * Documentos múltiples de LicenciaConstruccion → IdTipoFoto fijo.
 * Nombres exactos del formulario (case-sensitive).
 * Uso exclusivo de PATCH /registros_actualizar (contrato anterior).
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
  'ClaveCatastral',
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
