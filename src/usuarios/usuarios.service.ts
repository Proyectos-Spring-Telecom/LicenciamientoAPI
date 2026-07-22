//Servicio usuario
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { Usuarios } from 'src/entities/Usuarios';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import { UpdateUsuarioContrasena } from './dto/update-usuario-contrasena.dto';
import { MailService } from 'src/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { EnumModulos } from 'src/common/estatus.enum';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type UsuarioVisibilityAuth = {
  idRol: 2 | 3 | 4;
  idGrupo: number | null;
};

type VisibilityWhere = {
  sql: string;
  params: unknown[];
};

@Injectable()
export class UsuariosService {
  private readonly usuarioSelect = `
SELECT
  u.Id AS Id,
  u.UserName AS UserName,
  u.Nombre AS Nombre,
  u.ApellidoPaterno AS ApellidoPaterno,
  u.ApellidoMaterno AS ApellidoMaterno,
  u.PhoneNumber AS PhoneNumber,
  u.FechaCreacion AS FechaCreacion,
  u.FechaActualizacion AS FechaActualizacion,
  u.UltimoLogin AS UltimoLogin,
  u.Estatus AS estatus,
  u.EmailConfirmed AS EmailConfirmed,
  u.IdRol AS IdRol,
  r.Nombre AS RolNombre,
  u.IdGrupo AS IdGrupo
FROM Usuarios u
INNER JOIN Roles r ON u.IdRol = r.Id`;

  private readonly usuarioSelectById = `
SELECT
  u.Id AS id,
  u.UserName AS userName,
  u.Nombre AS nombre,
  u.ApellidoPaterno AS apellidoPaterno,
  u.ApellidoMaterno AS apellidoMaterno,
  u.PhoneNumber AS phoneNumber,
  u.FechaCreacion AS fechaCreacion,
  u.FechaActualizacion AS fechaActualizacion,
  u.UltimoLogin AS ultimoLogin,
  u.Estatus AS estatus,
  u.EmailConfirmed AS emailConfirmed,
  u.IdRol AS idRol,
  r.Nombre AS rolNombre,
  u.IdGrupo AS idGrupo
FROM Usuarios u
INNER JOIN Roles r ON u.IdRol = r.Id`;

  constructor(
    @InjectRepository(Usuarios)
    private readonly usuarioRepository: Repository<Usuarios>,
    private readonly bitacoraLogger: BitacoraLoggerService,
    private readonly emailService: MailService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) { }

  private mapUsuario(item: Record<string, unknown>) {
    return {
      ...item,
      Id: Number(item.Id),
      IdRol: Number(item.IdRol),
      IdGrupo: item.IdGrupo != null ? Number(item.IdGrupo) : null,
    };
  }

  /**
   * Resuelve y valida el alcance de consulta a partir del JWT.
   * Rol 1 / inválido → 403. Rol 2 sin grupo → 403.
   */
  private assertUsuarioVisibilityAuth(
    user: AuthenticatedUser,
  ): UsuarioVisibilityAuth {
    if (user.rol === undefined || user.rol === null) {
      throw new ForbiddenException(
        'Rol sin permisos para consultar usuarios.',
      );
    }

    const idRol = Number(user.rol);
    if (!Number.isInteger(idRol)) {
      throw new ForbiddenException('Rol de usuario inválido.');
    }

    if (idRol === 1) {
      throw new ForbiddenException(
        'No tiene permisos para consultar usuarios.',
      );
    }

    if (idRol !== 2 && idRol !== 3 && idRol !== 4) {
      throw new ForbiddenException(
        'Rol sin permisos para consultar usuarios.',
      );
    }

    let idGrupo: number | null = null;
    if (
      user.idGrupo !== undefined &&
      user.idGrupo !== null &&
      String(user.idGrupo).trim() !== ''
    ) {
      const parsedGrupo = Number(user.idGrupo);
      if (!Number.isInteger(parsedGrupo)) {
        idGrupo = null;
      } else {
        idGrupo = parsedGrupo;
      }
    }

    if (idRol === 2 && idGrupo == null) {
      throw new ForbiddenException(
        'El usuario autenticado no tiene un grupo asignado.',
      );
    }

    return { idRol, idGrupo };
  }

  /**
   * Condiciones SQL de visibilidad (sin WHERE).
   * Rol 4: sin restricción. Rol 3: excluye IdRol 4.
   * Rol 2: mismo IdGrupo del token y excluye IdRol 4.
   */
  private buildVisibilityWhere(auth: UsuarioVisibilityAuth): VisibilityWhere {
    switch (auth.idRol) {
      case 4:
        return { sql: '', params: [] };
      case 3:
        return { sql: 'u.IdRol <> ?', params: [4] };
      case 2:
        return {
          sql: 'u.IdGrupo = ? AND u.IdRol <> ?',
          params: [auth.idGrupo, 4],
        };
    }
  }

  private composeWhereClause(parts: string[]): string {
    const filtered = parts.filter((part) => part.trim().length > 0);
    return filtered.length > 0 ? `WHERE ${filtered.join(' AND ')}` : '';
  }

  async getAllUsuario(
    user: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    try {
      const auth = this.assertUsuarioVisibilityAuth(user);
      const visibility = this.buildVisibilityWhere(auth);
      const whereClause = this.composeWhereClause([visibility.sql]);
      const offset = (page - 1) * limit;

      const usuarios = await this.usuarioRepository.query(
        `${this.usuarioSelect}
${whereClause}
ORDER BY u.Id DESC
LIMIT ? OFFSET ?;`,
        [...visibility.params, limit, offset],
      );

      const totalResult = await this.usuarioRepository.query(
        `SELECT COUNT(*) AS total
FROM Usuarios u
${whereClause}`,
        visibility.params,
      );

      const total = Number(totalResult[0]?.total || 0);

      return {
        data: usuarios.map((item) => this.mapUsuario(item)),
        paginated: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al obtener la paginación de usuarios.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAllListUsuarios(
    user: AuthenticatedUser,
  ): Promise<ApiResponseCommon> {
    try {
      const auth = this.assertUsuarioVisibilityAuth(user);
      const visibility = this.buildVisibilityWhere(auth);
      const whereClause = this.composeWhereClause([visibility.sql]);

      const usuarios = await this.usuarioRepository.query(
        `${this.usuarioSelect}
${whereClause}
ORDER BY u.Id DESC;`,
        visibility.params,
      );

      return {
        data: usuarios.map((item) => this.mapUsuario(item)),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al obtener el listado de usuarios.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAllListUsuariosGrupo(
    idGrupo: number,
    user: AuthenticatedUser,
  ): Promise<ApiResponseCommon> {
    try {
      const auth = this.assertUsuarioVisibilityAuth(user);

      if (auth.idRol === 2 && idGrupo !== auth.idGrupo) {
        throw new ForbiddenException(
          'No tiene permisos para consultar usuarios de otro grupo.',
        );
      }

      const where: FindOptionsWhere<Usuarios> = {
        estatus: 1,
        idGrupo,
      };

      if (auth.idRol === 2 || auth.idRol === 3) {
        where.idRol = Not(4);
      }

      const usuarios = await this.usuarioRepository.find({ where });

      if (usuarios.length === 0) {
        throw new NotFoundException('No se encontraron usuarios.');
      }

      const usuariosSinPassword = usuarios.map(
        ({ passwordHash, ...rest }) => rest,
      );

      return { data: usuariosSinPassword };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message:
          'Se produjo un error al intentar obtener los usuarios asociados al grupo.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUsuarioByID(id: number) {
    try {
      const usuarioData = await this.usuarioRepository.query(
        `${this.usuarioSelectById}
WHERE u.Id = ?
ORDER BY u.Id DESC`,
        [id],
      );

      if (usuarioData.length === 0) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      const usuario = usuarioData.map((item) => ({
        ...item,
        id: Number(item.id),
        idRol: Number(item.idRol),
        idGrupo: item.idGrupo != null ? Number(item.idGrupo) : null,
      }));

      return { data: { usuario } };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al obtener al usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async createUsuario(
    createUsuarioDto: CreateUsuarioDto,
    idUser: string,
  ): Promise<ApiCrudResponse> {
    try {
      if (createUsuarioDto.password !== createUsuarioDto.confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden.');
      }

      const existUsuario = await this.usuarioRepository.findOne({
        where: { userName: createUsuarioDto.correo },
      });
      if (existUsuario) {
        throw new BadRequestException('El correo ya se encuentra registrado.');
      }

      const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

      const newUser = this.usuarioRepository.create({
        nombre: createUsuarioDto.nombre,
        apellidoPaterno: createUsuarioDto.apellidoPaterno,
        apellidoMaterno: createUsuarioDto.apellidoMaterno,
        phoneNumber: createUsuarioDto.telefono,
        userName: createUsuarioDto.correo,
        passwordHash: hashedPassword,
        idRol: createUsuarioDto.idRol,
        idGrupo: createUsuarioDto.idGrupo ?? null,
        emailConfirmed: createUsuarioDto.emailConfirmed ?? 1,
        estatus: createUsuarioDto.estatus ?? 1,
      });

      const userSave = await this.usuarioRepository.save(newUser);

      const querylogger = {
        nombre: createUsuarioDto.nombre,
        apellidoPaterno: createUsuarioDto.apellidoPaterno,
        apellidoMaterno: createUsuarioDto.apellidoMaterno,
        phoneNumber: createUsuarioDto.telefono,
        correo: createUsuarioDto.correo,
        idRol: createUsuarioDto.idRol,
        idGrupo: createUsuarioDto.idGrupo ?? null,
        emailConfirmed: createUsuarioDto.emailConfirmed ?? 1,
        estatus: createUsuarioDto.estatus ?? 1,
      };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se ha creado un usuario con nombre: ${createUsuarioDto.nombre}.`,
        'CREATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.SUCCESS,
      );

      const { passwordHash: _, ...usuarioSinPassword } = userSave;

      return {
        status: 'success',
        message: 'Usuario creado correctamente',
        data: {
          id: Number(usuarioSinPassword.id),
          nombre:
            `${usuarioSinPassword.nombre} ${usuarioSinPassword.apellidoPaterno} ` ||
            '',
        },
      };
    } catch (error) {
      const querylogger = { createUsuarioDto };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se ha creado un usuario con nombre: ${createUsuarioDto.nombre}.`,
        'CREATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al intentar crear el usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateContrasena(
    id: number,
    idUser: string | number,
    updateUsuarioContrasena: UpdateUsuarioContrasena,
  ) {
    try {
      if (Number(id) !== Number(idUser)) {
        throw new ForbiddenException(
          'Solo puede cambiar la contraseña de su propia cuenta.',
        );
      }

      const usuario = await this.usuarioRepository.findOne({
        where: { id },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró un usuario con ID: ${id}.`);
      }

      if (
        updateUsuarioContrasena.passwordNueva !==
        updateUsuarioContrasena.passwordNuevaConfirmacion
      ) {
        throw new BadRequestException(
          'Las nuevas contraseñas no coinciden. Por favor, verifique la información ingresada e intente nuevamente.',
        );
      }

      if (
        !usuario.passwordHash ||
        !(await bcrypt.compare(
          updateUsuarioContrasena.passwordActual,
          usuario.passwordHash,
        ))
      ) {
        throw new BadRequestException('Credenciales inválidas.');
      }

      const hashedPassword = await bcrypt.hash(
        updateUsuarioContrasena.passwordNueva,
        10,
      );

      await this.usuarioRepository.update(id, {
        passwordHash: hashedPassword,
      });

      await this.authService.revokeAllRefreshSessionsForUser(id);

      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se ha actualizado la contraseña del usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'La contraseña ha sido actualizada correctamente.',
        data: {
          id,
          nombre: `${usuario.nombre} ${usuario.apellidoPaterno} ` || '',
        },
      };
    } catch (error) {
      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se ha actualizado la contraseña del usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al actualizar la contraseña.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateUsuario(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
    idUser: string,
  ): Promise<ApiCrudResponse> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró un usuario con ID: ${id}.`);
      }

      await this.usuarioRepository.update(id, {
        nombre: updateUsuarioDto.nombre,
        apellidoPaterno: updateUsuarioDto.apellidoPaterno,
        apellidoMaterno: updateUsuarioDto.apellidoMaterno,
        phoneNumber: updateUsuarioDto.telefono,
        idRol: updateUsuarioDto.idRol,
        idGrupo: updateUsuarioDto.idGrupo,
      });

      const newUser = await this.usuarioRepository.findOne({
        where: { id },
      });
      if (!newUser) {
        throw new NotFoundException(`No se encontró un usuario con ID: ${id}.`);
      }

      const { passwordHash: _, ...usuarioSinPassword } = newUser;

      const querylogger = { updateUsuarioDto };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se actualizó el usuario: ${newUser.nombre} con ID: ${newUser.id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'El usuario ha sido actualizado correctamente.',
        data: {
          id,
          nombre:
            `${usuarioSinPassword.nombre} ${usuarioSinPassword.apellidoPaterno} ` ||
            '',
        },
      };
    } catch (error) {
      const querylogger = { updateUsuarioDto };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se actualizó el usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al actualizar el usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateUsuarioEstatus(
    id: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró un usuario con ID: ${id}.`);
      }

      const estatus = usuario.estatus === 1 ? 0 : 1;
      await this.usuarioRepository.update(id, { estatus });

      const querylogger = { id, estatus };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se cambió el estatus del usuario ${usuario.nombre} con ID: ${id} a estatus: ${estatus}.`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'El estatus del usuario ha sido actualizado correctamente.',
        estatus: { estatus },
        data: {
          id,
          nombre: `${usuario.nombre} ${usuario.apellidoPaterno} ` || '',
        },
      };
    } catch (error) {
      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se cambió el estatus del usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'No se pudo actualizar el estatus del usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async deleteUsuario(id: number, idUser: string): Promise<ApiCrudResponse> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró un usuario con ID: ${id}.`);
      }

      await this.usuarioRepository.update(id, { estatus: 0 });

      const querylogger = { id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se eliminó el usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'El usuario ha sido eliminado correctamente.',
        data: {
          id,
          nombre: `${usuario.nombre} ${usuario.apellidoPaterno} ` || '',
        },
      };
    } catch (error) {
      const querylogger = { id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se eliminó el usuario con ID: ${id}.`,
        'UPDATE',
        querylogger,
        Number(idUser),
        EnumModulos.USUARIOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Hubo un problema al intentar eliminar el usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
