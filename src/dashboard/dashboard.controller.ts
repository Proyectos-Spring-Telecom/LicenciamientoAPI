import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Post('card')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtener indicadores generales del dashboard',
    description: `
Cuenta todos los registros de la tabla \`Registros\` con \`FechaCreacion <= NOW()\`.

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

Opcionalmente acepta \`fechaInicial\`, \`fechaFinal\`, \`idGrupo\` e
\`idCapturista\`. \`capturaPeriodo\` solo se calcula cuando existen ambas fechas.
Utiliza consultas SQL agregadas, sin consultas por mes ni por estatus.
`,
  })
  @ApiBody({
    type: DashboardFilterDto,
    required: false,
    description:
      'Filtros opcionales para capturaPeriodo. Las fechas deben enviarse juntas.',
  })
  @ApiOkResponse({
    description:
      'Conteos globales, estadística mensual, estado actual, captura del periodo y registros por capturista.',
    type: DashboardResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  getCard(
    @Body() filters: DashboardFilterDto = {},
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getCard(filters);
  }

}
