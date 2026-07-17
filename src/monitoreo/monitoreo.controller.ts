import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { MonitoreoListadoItemDto } from './dto/monitoreo-listado-item.dto';
import { MonitoreoService } from './monitoreo.service';

@ApiTags('Monitoreo')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('monitoreo')
export class MonitoreoController {
  constructor(private readonly monitoreoService: MonitoreoService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtiene el listado de monitoreo',
    description: `
Devuelve un arreglo JSON directo (sin propiedad \`data\`) con todos los registros
visibles para el usuario autenticado, según su rol.
El servicio no utiliza paginación ni filtros de fecha.

- Rol 4: todos los registros.
- Rol 3: todos los registros.
- Rol 2: registros asociados a su grupo.
- Rol 1: registros capturados por el usuario.

Cada elemento es un objeto plano en camelCase: atributos de Registros,
Licencias y CapturistaVisita/Usuarios (capturista y supervisor) en el mismo nivel.
Si no hay fila relacionada, esos atributos se devuelven como null.

Orden: FechaCreacion DESC, Id DESC.
No recibe parámetros de consulta.
`,
  })
  @ApiOkResponse({
    description:
      'Arreglo plano de monitoreo (Registros + Licencias + capturista/supervisor). Sin wrapper data ni objetos anidados.',
    type: MonitoreoListadoItemDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description:
      'Rol no autorizado, supervisor sin grupo, o usuario no identificable',
  })
  findAll(
    @Request() req: { user: AuthenticatedUser },
  ): Promise<MonitoreoListadoItemDto[]> {
    return this.monitoreoService.findAll(req.user);
  }

  @Get(':idRegistro')
  @ApiOperation({
    summary: 'Obtiene el detalle completo de un registro',
    description: `
Devuelve un único registro visible para el usuario autenticado y todos sus datos relacionados.
Los campos del registro principal están en camelCase.

Incluye campos planos de CapturistaVisita y nombres de capturista/supervisor
(Usuarios), también en camelCase y en el mismo nivel (sin objetos anidados):
idCapturista, nombreCompletoCapturista, idSupervisor, nombreCompletoSupervisor, etc.
Si no hay visita o faltan usuarios, esos atributos se devuelven como null.

Aplica la misma visualización por rol del listado:
Rol 4/3: todos; Rol 2: grupo; Rol 1: capturista.
`,
  })
  @ApiParam({
    name: 'idRegistro',
    required: true,
    example: 150,
    description: 'Identificador del registro que se desea consultar.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalle del registro (camelCase) con capturista/supervisor planos y relaciones según PredioObra',
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador de registro inválido',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(
    @Param('idRegistro', ParseIntPipe) idRegistro: number,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.monitoreoService.findOne(idRegistro, req.user);
  }
}
