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
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateUsuarioContrasena } from './dto/update-usuario-contrasena.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiResponseCommon, ApiCrudResponse } from 'src/common/ApiResponse';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

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
      'Registra un usuario con nombre, apellidos, teléfono, correo, contraseña, rol y grupo.',
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
          telefono: '5512345678',
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
    description:
      'Lista todos los usuarios sin paginación. Visibilidad según JWT: rol 4 = todos; rol 3 = excepto rol 4; rol 2 = mismo grupo y excepto rol 4; rol 1 = denegado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de usuarios obtenida exitosamente',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol autenticado no tiene permisos para consultar usuarios.',
  })
  async findAllList(
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiResponseCommon> {
    return await this.usuariosService.getAllListUsuarios(req.user);
  }

  @Get('list/grupo/:id')
  @ApiOperation({
    summary: 'Obtener usuarios por grupo específico',
    description:
      'Obtiene usuarios activos del grupo. Visibilidad según JWT: rol 4 = cualquier grupo; rol 3 = cualquier grupo excepto usuarios rol 4; rol 2 = solo su grupo del token (y excepto rol 4); rol 1 = denegado.',
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
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol autenticado no tiene permisos para consultar usuarios o intentó consultar otro grupo.',
  })
  async findAllListUsuarioGrupo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiResponseCommon> {
    return await this.usuariosService.getAllListUsuariosGrupo(id, req.user);
  }

  @Get(':page/:limit')
  @ApiOperation({
    summary: 'Obtener usuarios con paginación',
    description:
      'Lista paginada de usuarios. Visibilidad según JWT: rol 4 = todos; rol 3 = excepto rol 4; rol 2 = mismo grupo y excepto rol 4; rol 1 = denegado. El total refleja únicamente usuarios visibles.',
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
    description: 'Usuarios obtenidos exitosamente con paginación',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol autenticado no tiene permisos para consultar usuarios.',
  })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<ApiResponseCommon> {
    return await this.usuariosService.getAllUsuario(req.user, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description:
      'Obtiene la información del usuario por ID, sin filtro de visibilidad por rol o grupo.',
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
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o vencido.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.getUsuarioByID(+id);
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
      'Actualiza nombre, apellidos, teléfono, rol y grupo de un usuario existente.',
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
          telefono: '5512345678',
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