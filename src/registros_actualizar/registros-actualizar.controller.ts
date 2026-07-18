import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { CATASTRO_FILE_FIELD_NAMES } from 'src/registros/catastro.constants';
import { LICENCIA_CONSTRUCCION_FILE_TYPE_MAP } from 'src/registros/licencia-construccion.constants';
import { LICENCIAS_FILE_FIELD_NAMES } from 'src/registros/licencias.constants';
import { PROTECCION_CIVIL_FILE_FIELD_NAMES } from 'src/registros/proteccion-civil.constants';
import { SAPAC_FILE_FIELD_NAMES } from 'src/registros/sapac.constants';
import { RegistrosActualizarService } from './registros-actualizar.service';

const UPLOAD_MAX =
  Number(process.env.UPLOAD_MAX_SIZE) > 0
    ? Number(process.env.UPLOAD_MAX_SIZE)
    : 10 * 1024 * 1024;

const MAX_UPLOAD_FILES =
  Object.keys(LICENCIA_CONSTRUCCION_FILE_TYPE_MAP).length +
  Object.keys(SAPAC_FILE_FIELD_NAMES).length +
  Object.keys(CATASTRO_FILE_FIELD_NAMES).length +
  Object.keys(LICENCIAS_FILE_FIELD_NAMES).length +
  Object.keys(PROTECCION_CIVIL_FILE_FIELD_NAMES).length;

const binaryTiny = {
  type: 'integer' as const,
  enum: [0, 1],
  nullable: true,
};

/** Campos de archivo de LicenciaConstruccion: máx. 1 archivo por campo. */
const LC_FILE_INTERCEPTOR_FIELDS = Object.keys(
  LICENCIA_CONSTRUCCION_FILE_TYPE_MAP,
).map((name) => ({ name, maxCount: 1 }));

/**
 * Nombres que también existen como indicador tinyint en el body.
 * NestJS los separa (body vs files); Swagger solo documenta una propiedad.
 */
const LC_FILE_BODY_COLLISION = new Set([
  'LicenciaConstruccion.LicenciaUsoSuelo',
  'LicenciaConstruccion.PlanoAutorizado',
  'LicenciaConstruccion.LicenciaFraccionamiento',
]);

/** Swagger: un binario opcional por campo/IdTipoFoto de LicenciaConstruccion. */
const LC_FILE_SWAGGER_PROPERTIES = Object.fromEntries(
  Object.entries(LICENCIA_CONSTRUCCION_FILE_TYPE_MAP).map(
    ([name, idTipoFoto]) => [
      name,
      {
        type: 'string' as const,
        format: 'binary' as const,
        description:
          `Opcional. JPG/JPEG/PNG/PDF. Máx. 1 archivo. Solo PredioObra efectivo=1. IdTipoFoto=${idTipoFoto} → FotosLicenciaConstruccion (reemplaza Ruta si existe; no elimina archivo anterior)` +
          (LC_FILE_BODY_COLLISION.has(name)
            ? '. Nota: si se envía como texto en el body, el mismo nombre corresponde al indicador tinyint 0/1.'
            : ''),
      },
    ],
  ),
);

@ApiTags('Registros Actualizar')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('registros_actualizar')
export class RegistrosActualizarController {
  constructor(
    private readonly registrosActualizarService: RegistrosActualizarService,
  ) {}

  @Patch()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Actualiza parcialmente Registros según PredioObra efectivo (0 o 1)',
    description: `
Actualiza columnas de \`Registros\` y secciones según el PredioObra efectivo
(\`body.PredioObra ?? registro.PredioObra\`):

- **PredioObra = 0:** Sapac, Catastro, Licencias (+ Contacto), ProteccionCivil (+ ContactoRepresentante) y archivos → Fotos (reemplazo no destructivo de Ruta).
- **PredioObra = 1:** LicenciaConstruccion, Corresponsables y archivos individuales
  (1 por IdTipoFoto) → FotosLicenciaConstruccion (reemplazo no destructivo de Ruta).

- \`idRegistro\` es obligatorio (body multipart).
- Campos omitidos / vacíos / null no sobrescriben valores existentes.
- Valores \`0\` sí se actualizan.
- Archivos antiguos no se eliminan del disco; solo se actualiza \`Fotos.Ruta\` o se crea fila.
- \`Estatus\` no se modifica (usar \`PATCH /registros/:idRegistro/estatus\`).
`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Formulario plano multipart. Secciones con notación punto. Archivos con nombres exactos del POST.',
    schema: {
      type: 'object',
      required: ['idRegistro'],
      properties: {
        idRegistro: { type: 'integer', example: 10, minimum: 1 },
        Registro: { type: 'string', maxLength: 25, nullable: true },
        Latitud: { type: 'number', example: 18.9212, nullable: true },
        Longitud: { type: 'number', example: -99.2345, nullable: true },
        EntidadFederativa: { type: 'string', maxLength: 100, nullable: true },
        Municipio: { type: 'string', maxLength: 100, nullable: true },
        Localidad: { type: 'string', maxLength: 100, nullable: true },
        Colonia: { type: 'string', maxLength: 100, nullable: true },
        Calle: { type: 'string', maxLength: 100, nullable: true },
        NoInterior: { type: 'string', maxLength: 50, nullable: true },
        NoExterior: { type: 'string', maxLength: 50, nullable: true },
        CP: { type: 'string', maxLength: 45, nullable: true },
        TipoRegistro: {
          type: 'integer',
          enum: [0, 1],
          description: '0 = Local comercial, 1 = Vivienda',
          example: 0,
          nullable: true,
        },
        PredioObra: {
          type: 'integer',
          enum: [0, 1],
          description:
            '0 = No construcción (permite Sapac/Catastro/Licencias/PC). 1 = En construcción (ignora esas secciones en esta etapa).',
          example: 0,
          nullable: true,
        },
        'Sapac.NumeroCuenta': { type: 'string', maxLength: 50, nullable: true },
        'Sapac.Nombre': { type: 'string', maxLength: 100, nullable: true },
        'Sapac.ApellidoPaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Sapac.ApellidoMaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Sapac.RFC': { type: 'string', maxLength: 16, nullable: true },
        'Sapac.Sector': { type: 'integer', nullable: true },
        'Sapac.Ruta': { type: 'integer', nullable: true },
        'Sapac.Folio': { type: 'string', maxLength: 50, nullable: true },
        'Sapac.IdTipoServicio': {
          type: 'integer',
          enum: [1, 2],
          description: '1 = SM, 2 = SP',
          example: 1,
          nullable: true,
        },
        'Sapac.Medidor': { type: 'string', maxLength: 50, nullable: true },
        'Catastro.Clave': {
          type: 'string',
          maxLength: 200,
          nullable: true,
          example: '1100-01-002-003',
        },
        'Catastro.M2': { type: 'string', maxLength: 20, nullable: true },
        'Catastro.Superficie': { type: 'number', nullable: true },
        'Catastro.UsoSuelo': { type: 'string', maxLength: 20, nullable: true },
        'Licencias.Registro': { type: 'string', maxLength: 25, nullable: true },
        'Licencias.NombreComercial': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'Licencias.Giro': { type: 'string', maxLength: 100, nullable: true },
        'Licencias.LicenciaSuelo': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'Licencias.NombrePropietario': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.ApellidoPaternoPropietario': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.ApellidoMaternoPropietario': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.TipoPersona': {
          type: 'integer',
          enum: [1, 2],
          description: '1 = Persona física, 2 = Persona moral',
          example: 1,
          nullable: true,
        },
        'Licencias.RFC': { type: 'string', maxLength: 16, nullable: true },
        'Licencias.FechaExpedicion': {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        'Licencias.FechaRefrendo': {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        'Licencias.Estacionamiento': {
          type: 'integer',
          enum: [0, 1],
          nullable: true,
        },
        'Licencias.Tipo': { type: 'integer', nullable: true },
        'Licencias.FechaHora': {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        'Licencias.Contacto.Nombre': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.Contacto.ApellidoPaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.Contacto.ApellidoMaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'Licencias.Contacto.Telefono': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'Licencias.Contacto.Correo': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'ProteccionCivil.EsEmpresa': {
          type: 'integer',
          enum: [1, 2],
          description: '1 = Persona física, 2 = Persona moral',
          example: 1,
          nullable: true,
        },
        'ProteccionCivil.RazonSocial': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'ProteccionCivil.RFC': { type: 'string', maxLength: 16, nullable: true },
        'ProteccionCivil.Nombre': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.ApellidoPaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.ApellidoMaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.Telefono': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'ProteccionCivil.RegistroAcreditacion': {
          type: 'string',
          maxLength: 20,
          nullable: true,
        },
        'ProteccionCivil.TienePrograma': {
          type: 'integer',
          enum: [0, 1],
          description: '0 = No tiene, 1 = Sí tiene',
          example: 0,
          nullable: true,
        },
        'ProteccionCivil.ContactoRepresentante.Nombre': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.ContactoRepresentante.ApellidoPaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.ContactoRepresentante.ApellidoMaterno': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        'ProteccionCivil.ContactoRepresentante.Telefono': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'ProteccionCivil.ContactoRepresentante.Correo': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.TipoSolicitudLicencia': {
          type: 'integer',
          enum: [1, 2, 3, 4],
          nullable: true,
          example: 2,
          description:
            'Solo PredioObra=1. 1=Obra nueva, 2=Licencia sencilla, 3=Regularización, 4=Otros',
        },
        'LicenciaConstruccion.DescripcionProyecto': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.SuperficieTerrenoM2': {
          type: 'number',
          nullable: true,
          example: 250.5,
        },
        'LicenciaConstruccion.SuperficieTerrenoObraM2': {
          type: 'number',
          nullable: true,
          example: 180.25,
        },
        'LicenciaConstruccion.DescripcionSistemaConstructivo': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.NombrePropietario': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'LicenciaConstruccion.DomicilioNotificacion': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'LicenciaConstruccion.RFC': {
          type: 'string',
          maxLength: 16,
          nullable: true,
        },
        'LicenciaConstruccion.NombreDRO': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'LicenciaConstruccion.NoRegLicenciaConstruccion': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.CedulaProfesional': {
          type: 'string',
          maxLength: 30,
          nullable: true,
        },
        'LicenciaConstruccion.Fecha': {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        'LicenciaConstruccion.NumeroExpediente': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.NumeroControl': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.SeguimientoObra': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.ConstanciaAlineamiento': binaryTiny,
        // LicenciaUsoSuelo / PlanoAutorizado / LicenciaFraccionamiento:
        // coinciden con archivos; Swagger los documenta como binario en
        // LC_FILE_SWAGGER_PROPERTIES (con nota dual).
        'LicenciaConstruccion.Escrituras': binaryTiny,
        'LicenciaConstruccion.FactibilidadAguaPotable': binaryTiny,
        'LicenciaConstruccion.RecibosPagoPredial': binaryTiny,
        'LicenciaConstruccion.RecibosMunicipales': binaryTiny,
        'LicenciaConstruccion.PlanoArquitectonicos': binaryTiny,
        'LicenciaConstruccion.Otros': binaryTiny,
        'LicenciaConstruccion.Corresponsables[0].Id': {
          type: 'integer',
          nullable: true,
          description:
            'Solo PredioObra=1. Si se envía, actualiza ese corresponsable (debe pertenecer a la LC del registro).',
          example: 3,
        },
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[0].CedulaProfesional': {
          type: 'string',
          maxLength: 30,
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[1].Id': {
          type: 'integer',
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[1].NombreCompleto': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[1].NoRegLicenciaConstruccion': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'LicenciaConstruccion.Corresponsables[1].CedulaProfesional': {
          type: 'string',
          maxLength: 30,
          nullable: true,
        },
        [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: {
          type: 'string',
          format: 'binary',
          description:
            'Solo PredioObra=0. JPG/JPEG/PNG/PDF. IdTipoFoto=1 → Fotos (reemplaza Ruta si existe)',
        },
        [CATASTRO_FILE_FIELD_NAMES.reciboPredial]: {
          type: 'string',
          format: 'binary',
          description: 'Solo PredioObra=0. IdTipoFoto=2 → Fotos',
        },
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: {
          type: 'string',
          format: 'binary',
          description: 'Solo PredioObra=0. IdTipoFoto=3 → Fotos',
        },
        [SAPAC_FILE_FIELD_NAMES.caratulamedidor]: {
          type: 'string',
          format: 'binary',
          description: 'Solo PredioObra=0. IdTipoFoto=4 → Fotos',
        },
        [SAPAC_FILE_FIELD_NAMES.cuadromedidor]: {
          type: 'string',
          format: 'binary',
          description: 'Solo PredioObra=0. IdTipoFoto=5 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.fachada]: {
          type: 'string',
          format: 'binary',
          description:
            'Transversal: se procesa con PredioObra=0 y PredioObra=1. IdTipoFoto=6 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.estacionamiento]: {
          type: 'string',
          format: 'binary',
          description:
            'Transversal: se procesa con PredioObra=0 y PredioObra=1. IdTipoFoto=7 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.bodega]: {
          type: 'string',
          format: 'binary',
          description:
            'Transversal: se procesa con PredioObra=0 y PredioObra=1. IdTipoFoto=8 → Fotos',
        },
        [PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno]: {
          type: 'string',
          format: 'binary',
          description: 'Solo PredioObra=0. IdTipoFoto=9 → Fotos',
        },
        ...LC_FILE_SWAGGER_PROPERTIES,
      },
    },
  })
  @ApiOkResponse({
    description: 'Registro actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o sin campos útiles para actualizar',
  })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permisos para actualizar registros',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento,
          maxCount: 1,
        },
        { name: CATASTRO_FILE_FIELD_NAMES.reciboPredial, maxCount: 1 },
        { name: SAPAC_FILE_FIELD_NAMES.reciboSapac, maxCount: 1 },
        { name: SAPAC_FILE_FIELD_NAMES.caratulamedidor, maxCount: 1 },
        { name: SAPAC_FILE_FIELD_NAMES.cuadromedidor, maxCount: 1 },
        { name: LICENCIAS_FILE_FIELD_NAMES.fachada, maxCount: 1 },
        { name: LICENCIAS_FILE_FIELD_NAMES.estacionamiento, maxCount: 1 },
        { name: LICENCIAS_FILE_FIELD_NAMES.bodega, maxCount: 1 },
        { name: PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno, maxCount: 1 },
        ...LC_FILE_INTERCEPTOR_FIELDS,
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: UPLOAD_MAX, files: MAX_UPLOAD_FILES },
        fileFilter: (_req, file, cb) => {
          const mime = (file.mimetype || '').toLowerCase();
          const ok =
            mime === 'image/jpeg' ||
            mime === 'image/jpg' ||
            mime === 'image/png' ||
            mime === 'application/pdf';
          if (!ok) {
            return cb(
              new BadRequestException(
                `El archivo "${file.fieldname}" no tiene un tipo permitido (JPG, JPEG, PNG o PDF)`,
              ),
              false,
            );
          }
          return cb(null, true);
        },
      },
    ),
  )
  actualizar(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  ) {
    return this.registrosActualizarService.updateFromMultipart(
      body ?? {},
      files ?? {},
    );
  }
}
