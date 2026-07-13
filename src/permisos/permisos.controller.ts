import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { PermisosService, ModuloAgrupado, PermisoListItem } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Permisos')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(4) // Todos los roles pueden acceder por defecto
@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) { }

  @Post()
  @Roles() // Solo SuperAdministrador puede crear permisos
  async createPermioso(
    @Body() createPermiso: CreatePermisoDto,
    @Req() req,
  ): Promise<ApiCrudResponse> {
    const idUsuario = req.user.userId;
    return this.permisosService.createPermiso(createPermiso, idUsuario);
  }

  @Get(':page/:limit')
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
  ): Promise<ApiResponseCommon> {
    return await this.permisosService.findAll(page, limit);
  }

  @Get('list')
  async findAllList(): Promise<PermisoListItem[]> {
    return await this.permisosService.findAllList();
  }

  @Get('permisosAgrupados')
  async findAllAgrupado(@Req() req): Promise<ModuloAgrupado[]> {
    const idRol = req.user.rol;
    return await this.permisosService.obtenerPermisosAgrupados(idRol);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.permisosService.findOne(+id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermisoDto: UpdatePermisoDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.permisosService.update(id, updatePermisoDto, idUser);
  }

  @Patch(':id/estatus')
  @ApiOperation({
    summary: 'Alternar estatus del permiso',
    description:
      'Alterna el estatus del permiso (1↔0). No requiere body.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del permiso',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Estatus actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updatePermisoEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.permisosService.updateEstatus(id, idUser);
  }
  /* 
    @Delete(':id')
    @Roles(1) // Solo SuperAdministrador puede eliminar permisos
    remove(@Param('id') id: string, @Request() req): Promise<ApiCrudResponse> {
      const idUser = req.user.userId;
      return this.permisosService.remove(+id, idUser);
    } */
}
