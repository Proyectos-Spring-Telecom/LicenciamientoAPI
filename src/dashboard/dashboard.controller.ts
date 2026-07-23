import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { DashboardService } from './dashboard.service';
import { CapturaPeriodoRequestDto } from './dto/captura-periodo-request.dto';
import { CapturaPeriodoResponseDto } from './dto/captura-periodo-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { CapturaPeriodoService } from './services/captura-periodo.service';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly capturaPeriodoService: CapturaPeriodoService,
  ) {}

  @Post('card')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtener indicadores generales del dashboard',
    description: `
Cuenta registros de la tabla \`Registros\` con \`FechaCreacion <= NOW()\`.

Visibilidad según JWT:
- Roles 4 y 3: todos los registros.
- Rol 2: únicamente registros asociados a su \`IdGrupo\` vía \`CapturistaVisita\`.
- Rol 1 u otros: sin acceso.

Devuelve un objeto \`card\` con:
- \`totalRegistros\`: todos los registros del rango (cualquier estatus).
- \`informacionFaltante\`: estatus 1.
- \`rechazoSinRespuesta\`: estatus 2.
- \`datosCorrectos\`: estatus 3.
- \`revision\`: estatus 4.
- \`baja\`: estatus 5.

Además devuelve \`estadisticaOperativa\`, un arreglo de doce elementos (enero a diciembre)
con los conteos mensuales del año actual por estatus.

También devuelve \`estadoActual\` con la fecha de MySQL y los conteos de registros
creados hoy, usando el rango \`CURDATE()\` hasta el inicio del día siguiente.

\`registrosCapturistas\` agrupa la cantidad de registros por capturista según la
visita vigente de \`CapturistaVisita\`, desde el primer registro hasta la fecha actual.

Utiliza consultas SQL agregadas, sin consultas por mes ni por estatus.
La captura por periodo se consulta en \`POST /dashboard/captura-periodo\`.
`,
  })
  @ApiOkResponse({
    description:
      'Conteos globales, estadística mensual, estado actual y registros por capturista.',
    type: DashboardResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol autenticado no tiene permisos o el rol 2 no tiene un grupo válido.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  getCard(
    @Request() req: { user: AuthenticatedUser },
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getCard(req.user);
  }

  @Post('captura-periodo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Consulta la captura de registros por día dentro de un periodo',
    description: `
Devuelve el total general de registros por día y el desglose diario por estatus
(\`1\` Información faltante, \`2\` Rechazo o sin respuesta, \`3\` Datos correctos,
\`4\` Revisión, \`5\` Baja).

Las fechas \`fechaInicial\` y \`fechaFinal\` son inclusivas (\`YYYY-MM-DD\`).
Opcionalmente acepta \`idGrupo\` e \`idCapturista\` sobre la visita vigente.

Visibilidad según JWT:
- Roles 4 y 3: todos los registros (pueden filtrar por cualquier \`idGrupo\`).
- Rol 2: únicamente su \`IdGrupo\` del token; un \`idGrupo\` distinto → 403.
- Rol 1 u otros: sin acceso.
`,
  })
  @ApiBody({ type: CapturaPeriodoRequestDto })
  @ApiOkResponse({
    description: 'Totales diarios y desglose de registros por estatus',
    type: CapturaPeriodoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Fechas inválidas o fecha inicial posterior a la fecha final',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol autenticado no tiene permisos, el rol 2 no tiene grupo válido, o intenta consultar otro grupo.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  obtenerCapturaPeriodo(
    @Body() dto: CapturaPeriodoRequestDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<CapturaPeriodoResponseDto> {
    return this.capturaPeriodoService.obtenerCapturaPeriodo(dto, req.user);
  }
}
