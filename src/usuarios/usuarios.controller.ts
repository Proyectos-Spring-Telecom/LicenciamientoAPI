import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateUsuarioContrasena } from './dto/update-usuario-contrasena.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiResponseCommon, ApiCrudResponse } from 'src/common/ApiResponse';

@ApiTags('Usuarios')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles() // Todos los roles pueden acceder por defecto
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) { }

  // ==================== POST ====================

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Crear un nuevo usuario',
    description:
      'Registra un usuario con nombre, apellidos, correo, contraseña, rol y grupo.',
  })
  @ApiBody({
    type: CreateUsuarioDto,
    examples: {
      default: {
        summary: 'Crear usuario',
        value: {
          nombre: 'Capturista',
          apellidoPaterno: 'Sistemas',
          apellidoMaterno: '3',
          correo: 'capturista3@gmail.com',
          password: 'P@ssw0rd.',
          confirmPassword: 'P@ssw0rd.',
          idRol: 1,
          idGrupo: 1,
          emailConfirmed: 1,
          estatus: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo SuperAdministrador o Administrador pueden crear usuarios'
  })
  async createUsuario(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.usuariosService.createUsuario(createUsuarioDto, idUser);
  }

  // ==================== GET ====================

  @Get('list')
  @ApiOperation({
    summary: 'Obtener lista completa de usuarios',
    description: 'Obtiene todos los usuarios sin paginación según el rol del usuario autenticado'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de usuarios obtenida exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  async findAllList(@Request() req): Promise<ApiResponseCommon> {
    const idGrupo = req.user.idGrupo;
    const rol = req.user.rol;
    return await this.usuariosService.getAllListUsuarios(+idGrupo, +rol);
  }

  @Get('list/grupo/:id')
  @ApiOperation({
    summary: 'Obtener usuarios por grupo específico',
    description: 'Obtiene la lista de usuarios asociados a un grupo específico'
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del grupo',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios del grupo obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Grupo no encontrado'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  async findAllListUsuarioGrupo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseCommon> {
    return await this.usuariosService.getAllListUsuariosGrupo(id);
  }

  @Get(':page/:limit')
  @ApiOperation({
    summary: 'Obtener usuarios con paginación',
    description: 'Obtiene una lista paginada de usuarios según los parámetros especificados'
  })
  @ApiParam({
    name: 'page',
    type: 'number',
    description: 'Número de página',
    example: 1
  })
  @ApiParam({
    name: 'limit',
    type: 'number',
    description: 'Cantidad de registros por página',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Usuarios obtenidos exitosamente con paginación',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const idGrupo = req.user.idGrupo;
    const rol = req.user.rol;
    const idUser = req.user.userId;
    return await this.usuariosService.getAllUsuario(
      +idUser,
      +idGrupo,
      +rol,
      page,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene la información del usuario. Los permisos se gestionan por rol (RolesPermisos), no por usuario.'
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del usuario',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado exitosamente'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req
  ) {
    const idGrupo = req.user.idGrupo;
    const rol = req.user.rol;
    return this.usuariosService.getUsuarioByID(+id, +idGrupo, +rol);
  }

  // ==================== PATCH ====================

  @Patch('estatus/:id')
  @ApiOperation({
    summary: 'Alternar estatus del usuario',
    description:
      'Alterna el estatus del usuario (1↔0). No requiere body.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del usuario',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Estatus actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async changeUsuarioEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.usuariosService.updateUsuarioEstatus(id, idUser);
  }

  @Patch('actualizar/contrasena/:id')
  @ApiOperation({
    summary: 'Cambiar contraseña de usuario',
    description: 'Actualiza la contraseña de un usuario específico'
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del usuario',
    example: 1
  })
  @ApiBody({ type: UpdateUsuarioContrasena })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Contraseña inválida'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  async updateContrasena(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioContrasena: UpdateUsuarioContrasena,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.usuariosService.updateContrasena(
      id,
      idUser,
      updateUsuarioContrasena,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos del usuario',
    description:
      'Actualiza nombre, apellidos, rol y grupo de un usuario existente.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del usuario',
    example: 1,
  })
  @ApiBody({
    type: UpdateUsuarioDto,
    examples: {
      default: {
        summary: 'Actualizar usuario',
        value: {
          nombre: 'Capturista',
          apellidoPaterno: 'Sistemas',
          apellidoMaterno: '3',
          idRol: 1,
          idGrupo: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async updateUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return await this.usuariosService.updateUsuario(
      id,
      updateUsuarioDto,
      idUser,
    );
  }

  // ==================== DELETE ====================
  /* 
    @Delete(':id')
    @Roles(1) // Solo SuperAdministrador puede eliminar usuarios
    @ApiOperation({ 
      summary: 'Eliminar usuario',
      description: 'Elimina un usuario del sistema'
    })
    @ApiParam({
      name: 'id',
      type: 'number',
      description: 'ID del usuario a eliminar',
      example: 1
    })
    @ApiResponse({ 
      status: 200, 
      description: 'Usuario eliminado exitosamente',
    })
    @ApiResponse({ 
      status: 404, 
      description: 'Usuario no encontrado' 
    })
    @ApiResponse({ 
      status: 400, 
      description: 'No se puede eliminar el usuario' 
    })
    @ApiResponse({
      status: 401,
      description: 'No autorizado'
    })
    @ApiResponse({
      status: 403,
      description: 'Acceso denegado - Solo SuperAdministrador puede eliminar usuarios'
    })
    async deleteUsuario(
      @Param('id', ParseIntPipe) id: number,
      @Request() req,
    ): Promise<ApiCrudResponse> {
      const idUser = req.user.userId;
      return await this.usuariosService.deleteUsuario(id, idUser);
    } */
}