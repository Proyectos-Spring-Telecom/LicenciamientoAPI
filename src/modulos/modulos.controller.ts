import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ModulosService } from './modulos.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Modulos')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(4)
@Controller('modulos')
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) { }

  @Post()
  @Roles()
  @ApiOperation({
    summary: 'Crear un nuevo módulo',
    description: 'Registra un módulo en CatModulos con estatus activo (1) por defecto.',
  })
  @ApiBody({ type: CreateModuloDto })
  @ApiResponse({ status: 201, description: 'Módulo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o módulo duplicado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - Solo SuperAdministrador' })
  async create(
    @Body() createModuloDto: CreateModuloDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.modulosService.create(createModuloDto, idUser);
  }

  @Get('list')
  @ApiOperation({
    summary: 'Listar módulos activos',
    description:
      'Obtiene todos los módulos activos con estatus 1. Solo retorna id y nombre.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de módulos activos obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAllList() {
    return this.modulosService.findAllList();
  }

  @Get(':page/:limit')
  @ApiOperation({
    summary: 'Listar módulos paginados',
    description:
      'Obtiene módulos con paginación. Retorna data (id, nombre, estatus) y paginated.',
  })
  @ApiParam({
    name: 'page',
    type: 'number',
    description: 'Número de página',
    example: 1,
  })
  @ApiParam({
    name: 'limit',
    type: 'number',
    description: 'Cantidad de registros por página',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Módulos paginados obtenidos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
  ): Promise<ApiResponseCommon> {
    return this.modulosService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener módulo por ID',
    description: 'Consulta un módulo por su identificador con sus permisos.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del módulo',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Módulo obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Módulo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modulosService.findOne(id);
  }

  @Put()
  @ApiOperation({
    summary: 'Actualizar módulo',
    description: 'Actualiza el nombre de un módulo existente. El Id se envía en el body.',
  })
  @ApiBody({
    type: UpdateModuloDto,
    examples: {
      default: {
        summary: 'Actualizar módulo',
        value: { Id: 1, Nombre: 'Módulos' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Módulo actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o nombre duplicado' })
  @ApiResponse({ status: 404, description: 'Módulo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async update(
    @Body() updateModuloDto: UpdateModuloDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.modulosService.update(updateModuloDto, idUser);
  }

  @Patch(':id/estatus')
  @ApiOperation({
    summary: 'Alternar estatus del módulo',
    description:
      'Alterna el estatus del módulo (1↔0) y sincroniza el mismo estatus en todos sus permisos relacionados. No requiere body.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del módulo',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Estatus actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Módulo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateModuloEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.modulosService.updateModulosStatus(id, idUser);
  }
}
