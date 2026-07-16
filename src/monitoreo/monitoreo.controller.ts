import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ApiResponseCommon } from 'src/common/ApiResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { GetMonitoreoQueryDto } from './dto/get-monitoreo-query.dto';
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
Devuelve un listado paginado de registros según el alcance del rol del JWT:

- Rol 4: visualiza todos los registros.
- Rol 3: visualiza todos los registros.
- Rol 2: visualiza registros asociados a su grupo.
- Rol 1: visualiza únicamente sus registros.

Parámetros opcionales: \`page\` (default 1) y \`limit\` (default 10, máximo 100).
Orden: FechaCreacion DESC, Id DESC.
No se aceptan idRol, idGrupo ni idUsuario por query.
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
    description: 'Listado paginado de monitoreo (solo columnas de Registros)',
  })
  @ApiResponse({ status: 400, description: 'Parámetros de paginación inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description:
      'Rol no autorizado, supervisor sin grupo, o usuario no identificable',
  })
  findAll(
    @Query() query: GetMonitoreoQueryDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiResponseCommon> {
    return this.monitoreoService.findAll(query, req.user);
  }
}
