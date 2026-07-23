export enum EstatusEnum {
  /** Para `CodigoAutenticacion.Usado`: código ya utilizado. */
  ACTIVO = 1,
  /** Para `CodigoAutenticacion.Usado`: código aún no utilizado. */
  INACTIVO = 0,
}

export enum TipoCodigoAutenticacion {
  CONFIRMACION_CORREO = 0,
  RECUPERACION_CONTRASENA = 1,
}

export enum EnumModulos {
  MODULOS = 1,
  ROLES = 2,
  MONITOREO = 9,
  TABLERO = 19,
  LOCALES_COMERCIALES = 20,
  USUARIOS = 21,
  PERMISOS = 22,
  CAPTURISTA = 23,
  REGISTROS = 24,
}


