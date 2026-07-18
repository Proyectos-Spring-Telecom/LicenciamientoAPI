import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistroFotoResponseDto } from 'src/common/dto/registro-foto-response.dto';

export class RegistroDetalleCorresponsableDto {
  @ApiProperty({ example: 5 })
  Id: number;

  @ApiPropertyOptional({ nullable: true, example: 'Arq. Uno' })
  NombreCompleto: string | null;

  @ApiPropertyOptional({ nullable: true })
  NoRegLicenciaConstruccion: string | null;

  @ApiPropertyOptional({ nullable: true })
  CedulaProfesional: string | null;
}

/**
 * Sección LicenciaConstruccion del detalle (PredioObra = 1).
 * Combina columnas de la tabla LicenciaConstruccion (datos) con URLs de
 * FotosLicenciaConstruccion (archivos, una por IdTipoFoto o null).
 *
 * Los archivos licenciaUsoSuelo/planoAutorizado/licenciaFraccionamiento van
 * en camelCase porque LicenciaUsoSuelo/PlanoAutorizado/LicenciaFraccionamiento
 * (PascalCase) son los indicadores tinyint de la tabla.
 */
export class RegistroDetalleLicenciaConstruccionDto {
  @ApiProperty({ example: 20 })
  Id: number;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  TipoSolicitudLicencia: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Construcción de vivienda' })
  DescripcionProyecto: string | null;

  @ApiPropertyOptional({ nullable: true })
  SuperficieTerrenoM2: number | null;

  @ApiPropertyOptional({ nullable: true })
  SuperficieTerrenoObraM2: number | null;

  @ApiPropertyOptional({ nullable: true })
  DescripcionSistemaConstructivo: string | null;

  @ApiPropertyOptional({ nullable: true })
  NombrePropietario: string | null;

  @ApiPropertyOptional({ nullable: true })
  DomicilioNotificacion: string | null;

  @ApiPropertyOptional({ nullable: true })
  RFC: string | null;

  @ApiPropertyOptional({ nullable: true })
  NombreDRO: string | null;

  @ApiPropertyOptional({ nullable: true })
  NoRegLicenciaConstruccion: string | null;

  @ApiPropertyOptional({ nullable: true })
  CedulaProfesional: string | null;

  @ApiPropertyOptional({ nullable: true })
  Fecha: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'EXP-2026-001' })
  NumeroExpediente: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'CTRL-001' })
  NumeroControl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'En revisión' })
  SeguimientoObra: string | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: [0, 1],
    description: 'Indicador tinyint (dato, no archivo).',
  })
  ConstanciaAlineamiento: number | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: [0, 1],
    description: 'Indicador tinyint (dato; el archivo es licenciaUsoSuelo).',
  })
  LicenciaUsoSuelo: number | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: [0, 1],
    description: 'Indicador tinyint (dato; el archivo es planoAutorizado).',
  })
  PlanoAutorizado: number | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: [0, 1],
    description:
      'Indicador tinyint (dato; el archivo es licenciaFraccionamiento).',
  })
  LicenciaFraccionamiento: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  Escrituras: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  FactibilidadAguaPotable: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  RecibosPagoPredial: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  RecibosMunicipales: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  PlanoArquitectonicos: number | null;

  @ApiPropertyOptional({ nullable: true, enum: [0, 1] })
  Otros: number | null;

  @ApiProperty({ type: [RegistroDetalleCorresponsableDto] })
  Corresponsables: RegistroDetalleCorresponsableDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 10 o null.',
    example: 'https://dominio.com/registros/data/50/10/uuid.pdf',
  })
  constanciaAlineamiento: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 29 (Número Oficial) o null.',
    example: 'https://dominio.com/registros/data/50/29/uuid.pdf',
  })
  constanciaNumero: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 11 o null.',
    example: 'https://dominio.com/registros/data/50/11/uuid.pdf',
  })
  licenciaUsoSuelo: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 12 o null.',
    example: 'https://dominio.com/registros/data/50/12/uuid.pdf',
  })
  planoAutorizado: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 13 o null.',
    example: 'https://dominio.com/registros/data/50/13/uuid.pdf',
  })
  licenciaFraccionamiento: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 14 o null.',
    example: 'https://dominio.com/registros/data/50/14/uuid.pdf',
  })
  ConstanciaPropietario: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 15 o null.',
    example: 'https://dominio.com/registros/data/50/15/uuid.pdf',
  })
  Factibilidad: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 16 o null.',
    example: 'https://dominio.com/registros/data/50/16/uuid.pdf',
  })
  RecibosImpuestoPredial: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 17 o null.',
    example: 'https://dominio.com/registros/data/50/17/uuid.pdf',
  })
  JuegoDePlanosArquitectonicos1: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 31 o null.',
    example: 'https://dominio.com/registros/data/50/31/uuid.pdf',
  })
  JuegoDePlanosArquitectonicos2: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 32 o null.',
    example: 'https://dominio.com/registros/data/50/32/uuid.pdf',
  })
  JuegoDePlanosArquitectonicos3: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 18 o null.',
    example: 'https://dominio.com/registros/data/50/18/uuid.pdf',
  })
  otros: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 25 o null.',
    example: 'https://dominio.com/registros/data/50/25/uuid.png',
  })
  FirmaPropietario: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 26 o null.',
    example: 'https://dominio.com/registros/data/50/26/uuid.png',
  })
  FirmaDRO: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 27 o null.',
    example: 'https://dominio.com/registros/data/50/27/uuid.png',
  })
  FirmaCorresponsable: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL del archivo IdTipoFoto 28 o null.',
    example: 'https://dominio.com/registros/data/50/28/uuid.png',
  })
  FirmaResponsableRecepcionDocumento: string | null;
}

/**
 * Documentación Swagger del detalle GET /registros/:idRegistro.
 * La respuesta real se envuelve en `{ data }` (igual que Monitoreo)
 * e incluye relaciones anidadas según PredioObra (Sapac, Licencias, etc.).
 */
export class RegistroDetalleResponseDto {
  @ApiProperty({ example: 25 })
  id: number;

  @ApiPropertyOptional({ nullable: true, example: 'REG-00025' })
  registro: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitud: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitud: number | null;

  @ApiPropertyOptional({ nullable: true })
  entidadFederativa: string | null;

  @ApiPropertyOptional({ nullable: true })
  municipio: string | null;

  @ApiPropertyOptional({ nullable: true })
  localidad: string | null;

  @ApiPropertyOptional({ nullable: true })
  colonia: string | null;

  @ApiPropertyOptional({ nullable: true })
  calle: string | null;

  @ApiPropertyOptional({ nullable: true })
  noInterior: string | null;

  @ApiPropertyOptional({ nullable: true })
  noExterior: string | null;

  @ApiPropertyOptional({ nullable: true })
  cp: string | null;

  @ApiPropertyOptional({ nullable: true })
  tipoRegistro: number | null;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  predioObra: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4 })
  estatus: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaCreacion: Date | null;

  @ApiPropertyOptional({ nullable: true })
  fechaActualizacion: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 12 })
  idCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 25 })
  idRegistroCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  idGrupoCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaHoraCapturistaVisita: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 15 })
  idCapturista: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Juan' })
  nombreCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Pérez' })
  apellidoPaternoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'López' })
  apellidoMaternoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Juan Pérez López' })
  nombreCompletoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  idGrupoCapturista: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Grupo Norte' })
  nombreGrupoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 8 })
  idSupervisor: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'María' })
  nombreSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Torres' })
  apellidoPaternoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'García' })
  apellidoMaternoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'María Torres García' })
  nombreCompletoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 3 })
  idGrupoSupervisor: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Supervisores Centro' })
  nombreGrupoSupervisor: string | null;

  @ApiProperty({
    type: [RegistroFotoResponseDto],
    description:
      'Fotografías con IdTipoFoto 6, 7 u 8 (fachada/estacionamiento/bodega). Se incluyen sin depender de PredioObra.',
  })
  fotos: RegistroFotoResponseDto[];

  @ApiPropertyOptional({
    type: RegistroDetalleLicenciaConstruccionDto,
    nullable: true,
    description:
      'Sección presente cuando PredioObra = 1; null si el registro no tiene LicenciaConstruccion.',
  })
  LicenciaConstruccion?: RegistroDetalleLicenciaConstruccionDto | null;
}
