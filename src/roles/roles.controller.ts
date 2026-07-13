import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Request,
  Put,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-role.dto';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(4)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Crear un nuevo rol',
    description:
      'Crea un rol en Roles con estatus 1 y, opcionalmente, asigna permisos en RolesPermisos.',
  })
  @ApiBody({ type: CreateRolDto })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o permisos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() createRoleDto: CreateRolDto, @Request() req) {
    const idUser = req.user.userId;
    return this.rolesService.create(idUser, createRoleDto);
  }

  @Get('list')
  @ApiOperation({
    summary: 'Listar roles activos',
    description: 'Obtiene el listado de roles activos según el rol del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de roles obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAllList(@Request() req): Promise<ApiResponseCommon> {
    const rol = req.user.rol;
    return await this.rolesService.findAllList(+rol);
  }

  @Get(':page/:limit')
  @ApiOperation({
    summary: 'Listar roles paginados',
    description: 'Obtiene roles con paginación. Retorna data y paginated.',
  })
  @ApiParam({ name: 'page', type: 'number', description: 'Número de página', example: 1 })
  @ApiParam({
    name: 'limit',
    type: 'number',
    description: 'Cantidad de registros por página',
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'Roles paginados obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const rol = req.user.rol;
    return await this.rolesService.findAll(+rol, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener rol por ID',
    description:
      'Consulta un rol por su identificador e incluye sus permisos agrupados por módulo.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del rol', example: 1 })
  @ApiResponse({ status: 200, description: 'Rol obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Actualizar rol',
    description:
      'Actualiza el nombre del rol. Si se envía permisos[], sincroniza RolesPermisos (diff). El Id va en el body.',
  })
  @ApiBody({ type: UpdateRolDto })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 400, description: 'Rol no encontrado o permisos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  update(@Body() updateRolDto: UpdateRolDto, @Request() req) {
    const idUser = req.user.userId;
    return this.rolesService.update(idUser, updateRolDto);
  }

  @Patch('estatus/:id')
  @ApiOperation({
    summary: 'Alternar estatus del rol',
    description:
      'Alterna el estatus del rol (1↔0). No requiere body.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del rol',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Estatus actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.rolesService.updateEstatus(id, idUser);
  }
}
