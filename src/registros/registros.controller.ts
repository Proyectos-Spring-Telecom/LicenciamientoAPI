import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  FIRMA_FIELD_NAMES,
  LC_DOCUMENTO_FIELD_NAMES,
  MAX_DOCUMENTOS_POR_TIPO,
} from './licencia-construccion.constants';
import { GetRegistrosQueryDto } from './dto/get-registros-query.dto';
import { GetRegistrosByDateRangeDto } from './dto/get-registros-by-date-range.dto';
import { RegistroDetalleResponseDto } from './dto/registro-detalle-response.dto';
import { RegistroListadoItemDto } from './dto/registro-listado-item.dto';
import { UpdateRegistroEstatusDto } from './dto/update-registro-estatus.dto';
import { RegistrosService } from './registros.service';
import { SAPAC_FILE_FIELD_NAMES } from './sapac.constants';
import { CATASTRO_FILE_FIELD_NAMES } from './catastro.constants';
import { LICENCIAS_FILE_FIELD_NAMES } from './licencias.constants';
import { PROTECCION_CIVIL_FILE_FIELD_NAMES } from './proteccion-civil.constants';

const UPLOAD_MAX =
  Number(process.env.UPLOAD_MAX_SIZE) > 0
    ? Number(process.env.UPLOAD_MAX_SIZE)
    : 10 * 1024 * 1024;

const MAX_UPLOAD_FILES =
  Object.keys(FIRMA_FIELD_NAMES).length +
  Object.keys(LC_DOCUMENTO_FIELD_NAMES).length * MAX_DOCUMENTOS_POR_TIPO +
  Object.keys(SAPAC_FILE_FIELD_NAMES).length +
  Object.keys(CATASTRO_FILE_FIELD_NAMES).length +
  Object.keys(LICENCIAS_FILE_FIELD_NAMES).length +
  Object.keys(PROTECCION_CIVIL_FILE_FIELD_NAMES).length;

const binaryTiny = {
  type: 'integer' as const,
  enum: [0, 1],
  nullable: true,
};

const multiBinaryFiles = {
  type: 'array' as const,
  items: {
    type: 'string' as const,
    format: 'binary' as const,
  },
  maxItems: MAX_DOCUMENTOS_POR_TIPO,
};

@ApiTags('Registros')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) { }

  @Patch(':idRegistro/estatus')
  @Roles()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Actualizar el estatus de un registro',
    description: `
Actualiza exclusivamente \`Registros.Estatus\` y registra al usuario del JWT
como \`CapturistaVisita.IdSupervisor\`, dentro de una misma transacción.

Estados permitidos:
- 1 = Información Faltante
- 2 = Rechazo o Sin respuesta
- 3 = Datos Correctos
- 4 = Revisión
- 5 = Baja

Roles 3 y 4 pueden actualizar cualquier registro.
Rol 2 únicamente puede actualizar registros de su grupo.
`,
  })
  @ApiBody({ type: UpdateRegistroEstatusDto })
  @ApiResponse({
    status: 200,
    description: 'Estatus actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador o estatus inválido',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Rol no autorizado o registro fuera del grupo del usuario',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  updateEstatus(
    @Param('idRegistro', ParseIntPipe) idRegistro: number,
    @Body() dto: UpdateRegistroEstatusDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.registrosService.updateEstatus(idRegistro, dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar registros paginados',
    description: `
Consulta columnas de la tabla \`Registros\` más atributos planos de \`Licencias\`,
capturista/supervisor vía \`CapturistaVisita\` → \`Usuarios\` → \`Grupos\`,
y la colección \`fotos\` (IdTipoFoto 6, 7 u 8).
La visibilidad depende del rol del JWT:

- Rol 4: todos los registros.
- Rol 3: todos los registros.
- Rol 2: registros de su grupo (\`CapturistaVisita.IdGrupo\`).
- Rol 1: registros capturados por el usuario (\`CapturistaVisita.IdCapturista\`).

Si no hay fila de Licencias o CapturistaVisita, sus atributos se devuelven como null.
\`fotos\` siempre es un arreglo (vacío si no hay fotografías de esos tipos).
Parámetros opcionales: \`page\` (default 1) y \`limit\` (default 10, máximo 100).
Orden: FechaCreacion DESC, Id DESC.
No se aceptan \`idRol\`, \`idGrupo\` ni \`idUsuario\` por query.
`,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Número de página. El valor mínimo es 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Cantidad de registros por página. Máximo 100.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista paginada (data + paginated). Cada ítem incluye Licencias, capturista/supervisor/grupos y fotos 6/7/8 (nullable / arreglo).',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de paginación inválidos',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description:
      'Rol no autorizado, supervisor sin grupo, o usuario no identificable',
  })
  findAllPaginated(
    @Query() query: GetRegistrosQueryDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiResponseCommon> {
    return this.registrosService.findAllPaginated(query, req.user);
  }

  @Get(':idRegistro')
  @ApiOperation({
    summary: 'Obtener el detalle completo de un registro',
    description: `
Devuelve un único registro visible para el usuario autenticado y todos sus datos relacionados
(mismo contrato que \`GET /monitoreo/:idRegistro\`).

Los campos del registro principal, CapturistaVisita, capturista/supervisor/grupos y
\`fotos\` (tipos 6, 7 y 8) están en camelCase en el mismo nivel dentro de \`data\`.
Según \`PredioObra\` se agregan las relaciones anidadas (Sapac/Catastro/Licencias/ProteccionCivil
o LicenciaConstruccion).

Visibilidad por rol (JWT):
- Rol 4/3: cualquier registro.
- Rol 2: registros de su grupo.
- Rol 1: registros donde figura como capturista.
`,
  })
  @ApiParam({
    name: 'idRegistro',
    required: true,
    example: 25,
    description: 'Identificador del registro',
  })
  @ApiOkResponse({
    description:
      'Detalle del registro envuelto en `{ data }` (mismo contrato que Monitoreo).',
    type: RegistroDetalleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador de registro inválido',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description:
      'Rol no autorizado, supervisor sin grupo, o registro fuera de alcance',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(
    @Param('idRegistro', ParseIntPipe) idRegistro: number,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<{ data: Record<string, unknown> }> {
    return this.registrosService.findOne(idRegistro, req.user);
  }

  @Post('por-rango-fechas')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtiene registros por rango de fechas',
    description: `
Obtiene los registros creados dentro del rango solicitado (\`Registros.FechaCreacion\`)
con atributos planos de \`Licencias\`, capturista/supervisor/grupos
(\`CapturistaVisita\` → \`Usuarios\` → \`Grupos\`) y \`fotos\` (tipos 6, 7, 8)
en el mismo nivel (camelCase).
El body solo acepta \`fechaInicio\` y \`fechaFin\` (YYYY-MM-DD).
La visibilidad depende del rol contenido en el JWT:

- Rol 4: todos los registros del rango.
- Rol 3: todos los registros del rango.
- Rol 2: registros del rango asociados a su grupo.
- Rol 1: registros del rango capturados por el usuario.

Rango inclusivo: desde fechaInicio 00:00:00 hasta el final de fechaFin
(límite superior exclusivo = día siguiente 00:00:00).
Respuesta: arreglo JSON directo (sin propiedad data).
No se aceptan idRol, idGrupo ni idUsuario en el body.
`,
  })
  @ApiBody({ type: GetRegistrosByDateRangeDto })
  @ApiOkResponse({
    description:
      'Arreglo plano de Registros + Licencias + capturista/supervisor/grupos + fotos (sin wrapper data).',
    type: RegistroListadoItemDto,
    isArray: true,
  })
  @ApiResponse({
    status: 400,
    description: 'Fechas inválidas o fechaInicio mayor que fechaFin',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description:
      'Rol no autorizado, supervisor sin grupo, o usuario no identificable',
  })
  findByDateRange(
    @Body() dto: GetRegistrosByDateRangeDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<RegistroListadoItemDto[]> {
    return this.registrosService.findByDateRange(dto, req.user);
  }

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Crear un registro con SAPAC/Catastro/Licencias o LicenciaConstruccion',
    description: `
Alta de Registros vía multipart/form-data.

**Registros (obligatorios):** Latitud, Longitud, TipoRegistro, PredioObra (0 o 1).
Estatus=4 y Registro=null se asignan en servidor.

**PredioObra=1:** siempre crea LicenciaConstruccion (aunque no vengan más campos).
Corresponsables (\`LicenciaConstruccion.Corresponsables[i].*\`) son 1:N opcionales:
solo se crean elementos con información; \`IdLicenciaConstruccion\` lo asigna el backend.
**PredioObra=0:** siempre crea Sapac, Catastro, Licencias y ProteccionCivil (aunque no vengan más campos).
Contacto (Licencias.Contacto.*) solo se crea si tiene información.
ContactoRepresentante (ProteccionCivil.ContactoRepresentante.*) solo se crea si tiene información.

**Fotografías SAPAC** (JPG/JPEG/PNG/PDF, máx. 1 por campo; solo si PredioObra=0):
\`Sapac.reciboSapac\` (IdTipoFoto=3), \`Sapac.caratulamedidor\` (4) y
\`Sapac.cuadromedidor\` (5). Se guardan en disco y en la tabla Fotos.

**Catastro** (solo PredioObra=0): campos opcionales Clave, M2, Superficie, UsoSuelo.
Archivo opcional \`Catastro.reciboPredial\` (IdTipoFoto=2) → FotosRegistros / tabla Fotos.

**Licencias** (solo PredioObra=0): se crea siempre. Contacto opcional vía
\`Licencias.Contacto.*\`. Archivos opcionales:
\`licenciaFuncionamiento\` (1), \`fachada\` (6), \`estacionamiento\` (7), \`bodega\` (8).

**ProteccionCivil** (solo PredioObra=0): se crea siempre. ContactoRepresentante funcional 1:1
vía \`ProteccionCivil.ContactoRepresentante.*\` solo si tiene información.
Archivo opcional \`ProteccionCivil.vistoBueno\` (IdTipoFoto=9) → FotosRegistros / tabla Fotos.

**Firmas** (JPG/JPEG/PNG/PDF, máx. 1 por campo; solo si PredioObra=1):
\`LicenciaConstruccion.FirmaPropietario\` (IdTipoFoto=25), FirmaDRO (26),
FirmaCorresponsable (27), FirmaResponsableRecepcionDocumento (28).

**Documentos múltiples** (JPG/JPEG/PNG/PDF, hasta ${MAX_DOCUMENTOS_POR_TIPO} por campo; solo PredioObra=1):
\`constanciaAlineamientoyNumero\` (10), \`LicenciaUsoyPlano\` (11),
\`ConstanciaPropietario\` (14), \`Factibilidad\` (15), \`RecibosImpuestoPredial\` (16),
\`JuegoDePlanosArquitectonicos\` (17), \`otros\` (18).
Cada archivo genera una fila en FotosLicenciaConstruccion.
Se guardan en disco y en la tabla FotosLicenciaConstruccion (no en columnas de LC).

**Autenticación:** requiere JWT (Bearer). El capturista (IdCapturista) y el grupo
(IdGrupo) se obtienen del token, nunca del form-data. Tras crear el Registro se
genera automáticamente una fila en CapturistaVisita con IdSupervisor=null.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['Latitud', 'Longitud', 'TipoRegistro', 'PredioObra'],
      properties: {
        Latitud: { type: 'number', example: 18.9530959 },
        Longitud: { type: 'number', example: -99.2353385 },
        TipoRegistro: {
          type: 'integer',
          enum: [0, 1],
          description: 'Tipo de registro: 0 = Local comercial, 1 = Vivienda',
          example: 0,
        },
        PredioObra: {
          type: 'integer',
          enum: [0, 1],
          description:
            'Estado de construcción del predio: 0 = No está en construcción, 1 = En construcción',
          example: 0,
        },
        EntidadFederativa: { type: 'string', nullable: true },
        Municipio: { type: 'string', nullable: true },
        Localidad: { type: 'string', nullable: true },
        Colonia: { type: 'string', nullable: true },
        Calle: { type: 'string', nullable: true },
        NoInterior: { type: 'string', nullable: true },
        NoExterior: { type: 'string', nullable: true },
        CP: { type: 'string', nullable: true },
        'Sapac.NumeroCuenta': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'Sapac.Nombre': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
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
        'Sapac.RFC': {
          type: 'string',
          maxLength: 16,
          nullable: true,
        },
        'Sapac.Sector': { type: 'integer', nullable: true },
        'Sapac.Ruta': { type: 'integer', nullable: true },
        'Sapac.Folio': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        'Sapac.IdTipoServicio': {
          type: 'integer',
          enum: [1, 2],
          nullable: true,
          description: 'Tipo de servicio SAPAC: 1 = SM, 2 = SP',
          example: 1,
        },
        'Sapac.Medidor': {
          type: 'string',
          maxLength: 50,
          nullable: true,
        },
        [SAPAC_FILE_FIELD_NAMES.reciboSapac]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=3 → Fotos',
        },
        [SAPAC_FILE_FIELD_NAMES.caratulamedidor]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=4 → Fotos',
        },
        [SAPAC_FILE_FIELD_NAMES.cuadromedidor]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=5 → Fotos',
        },
        'Catastro.Clave': {
          type: 'string',
          maxLength: 200,
          nullable: true,
          example: '1100-01-002-003',
          description:
            'Solo PredioObra=0. Clave catastral alfanumérica (texto). Conserva ceros a la izquierda.',
        },
        'Catastro.M2': {
          type: 'string',
          maxLength: 20,
          nullable: true,
        },
        'Catastro.Superficie': {
          type: 'number',
          nullable: true,
          description: 'Solo PredioObra=0. Double ≥ 0.',
        },
        'Catastro.UsoSuelo': {
          type: 'string',
          maxLength: 20,
          nullable: true,
        },
        [CATASTRO_FILE_FIELD_NAMES.reciboPredial]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=2 → FotosRegistros',
        },
        'Licencias.Registro': {
          type: 'string',
          maxLength: 25,
          nullable: true,
        },
        'Licencias.NombreComercial': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'Licencias.Giro': {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
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
          nullable: true,
          example: 1,
          description:
            'Tipo de persona: 1 = Persona física, 2 = Persona moral.',
        },
        'Licencias.RFC': {
          type: 'string',
          maxLength: 16,
          nullable: true,
        },
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
        'Licencias.Estacionamiento': binaryTiny,
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
          nullable: true,
          description: 'Tipo de persona: 1 = Persona física, 2 = Persona moral',
          example: 1,
        },
        'ProteccionCivil.RazonSocial': {
          type: 'string',
          maxLength: 191,
          nullable: true,
        },
        'ProteccionCivil.RFC': {
          type: 'string',
          maxLength: 16,
          nullable: true,
        },
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
          nullable: true,
          description:
            'Indica si cuenta con programa de Protección Civil: 0 = No tiene, 1 = Sí tiene',
          example: 1,
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
        [LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=1 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.fachada]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=6 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.estacionamiento]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=7 → Fotos',
        },
        [LICENCIAS_FILE_FIELD_NAMES.bodega]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=8 → Fotos',
        },
        [PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo PredioObra=0. IdTipoFoto=9 → FotosRegistros',
        },
        'LicenciaConstruccion.TipoSolicitudLicencia': {
          type: 'integer',
          enum: [1, 2, 3, 4],
          nullable: true,
          description:
            'Tipo de solicitud de licencia: 1 = Obra nueva, 2 = Licencia sencilla, 3 = Regularización y/o aprobación, cambio de uso, 4 = Otros, canalización vía pública',
          example: 1,
        },
        'LicenciaConstruccion.DescripcionProyecto': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.SuperficieTerrenoM2': {
          type: 'number',
          nullable: true,
        },
        'LicenciaConstruccion.SuperficieTerrenoObraM2': {
          type: 'number',
          nullable: true,
        },
        'LicenciaConstruccion.DescripcionSistemaConstructivo': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.NombrePropietario': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.DomicilioNotificacion': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.RFC': { type: 'string', nullable: true },
        'LicenciaConstruccion.NombreDRO': { type: 'string', nullable: true },
        'LicenciaConstruccion.NoRegLicenciaConstruccion': {
          type: 'string',
          nullable: true,
        },
        'LicenciaConstruccion.CedulaProfesional': {
          type: 'string',
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
        'LicenciaConstruccion.LicenciaUsoSuelo': binaryTiny,
        'LicenciaConstruccion.PlanoAutorizado': binaryTiny,
        'LicenciaConstruccion.LicenciaFraccionamiento': binaryTiny,
        'LicenciaConstruccion.Escrituras': binaryTiny,
        'LicenciaConstruccion.FactibilidadAguaPotable': binaryTiny,
        'LicenciaConstruccion.RecibosPagoPredial': binaryTiny,
        'LicenciaConstruccion.RecibosMunicipales': binaryTiny,
        'LicenciaConstruccion.PlanoArquitectonicos': binaryTiny,
        'LicenciaConstruccion.Otros': binaryTiny,
        'LicenciaConstruccion.Corresponsables[0].NombreCompleto': {
          type: 'string',
          maxLength: 191,
          nullable: true,
          description:
            'Solo PredioObra=1. Corresponsable indexado. No enviar Id ni IdLicenciaConstruccion.',
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
        [LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=10 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=11 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.ConstanciaPropietario]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=14 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.Factibilidad]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=15 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.RecibosImpuestoPredial]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=16 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.JuegoDePlanosArquitectonicos]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=17 → FotosLicenciaConstruccion',
        },
        [LC_DOCUMENTO_FIELD_NAMES.otros]: {
          ...multiBinaryFiles,
          description:
            'Múltiples JPG/JPEG/PNG/PDF. Solo PredioObra=1. IdTipoFoto=18 → FotosLicenciaConstruccion',
        },
        [FIRMA_FIELD_NAMES.FirmaPropietario]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo si PredioObra=1. IdTipoFoto=25 → FotosLicenciaConstruccion',
        },
        [FIRMA_FIELD_NAMES.FirmaDRO]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo si PredioObra=1. IdTipoFoto=26 → FotosLicenciaConstruccion',
        },
        [FIRMA_FIELD_NAMES.FirmaCorresponsable]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo si PredioObra=1. IdTipoFoto=27 → FotosLicenciaConstruccion',
        },
        [FIRMA_FIELD_NAMES.FirmaResponsableRecepcionDocumento]: {
          type: 'string',
          format: 'binary',
          description:
            'Opcional. JPG/JPEG/PNG/PDF. Solo si PredioObra=1. IdTipoFoto=28 → FotosLicenciaConstruccion',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registro creado (ApiCrudResponse)',
  })
  @ApiResponse({ status: 400, description: 'Validación fallida' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: FIRMA_FIELD_NAMES.FirmaPropietario, maxCount: 1 },
        { name: FIRMA_FIELD_NAMES.FirmaDRO, maxCount: 1 },
        { name: FIRMA_FIELD_NAMES.FirmaCorresponsable, maxCount: 1 },
        {
          name: FIRMA_FIELD_NAMES.FirmaResponsableRecepcionDocumento,
          maxCount: 1,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.constanciaAlineamientoyNumero,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.LicenciaUsoyPlano,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.ConstanciaPropietario,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.Factibilidad,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.RecibosImpuestoPredial,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.JuegoDePlanosArquitectonicos,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        {
          name: LC_DOCUMENTO_FIELD_NAMES.otros,
          maxCount: MAX_DOCUMENTOS_POR_TIPO,
        },
        { name: SAPAC_FILE_FIELD_NAMES.reciboSapac, maxCount: 1 },
        { name: SAPAC_FILE_FIELD_NAMES.caratulamedidor, maxCount: 1 },
        { name: SAPAC_FILE_FIELD_NAMES.cuadromedidor, maxCount: 1 },
        { name: CATASTRO_FILE_FIELD_NAMES.reciboPredial, maxCount: 1 },
        {
          name: LICENCIAS_FILE_FIELD_NAMES.licenciaFuncionamiento,
          maxCount: 1,
        },
        { name: LICENCIAS_FILE_FIELD_NAMES.bodega, maxCount: 1 },
        { name: LICENCIAS_FILE_FIELD_NAMES.fachada, maxCount: 1 },
        { name: LICENCIAS_FILE_FIELD_NAMES.estacionamiento, maxCount: 1 },
        { name: PROTECCION_CIVIL_FILE_FIELD_NAMES.vistoBueno, maxCount: 1 },
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
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files: Record<string, Express.Multer.File[]>,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiCrudResponse> {
    return this.registrosService.createFromMultipart(
      body ?? {},
      files ?? {},
      req.user.userId,
      req.user.idGrupo,
    );
  }
}
