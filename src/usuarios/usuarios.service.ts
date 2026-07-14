//Servicio usuario
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  private mapUsuario(item: Record<string, unknown>) {
    return {
      ...item,
      Id: Number(item.Id),
      IdRol: Number(item.IdRol),
      IdGrupo: item.IdGrupo != null ? Number(item.IdGrupo) : null,
    };
  }

  async getAllUsuario(
    idUser: number,
    idGrupo: number,
    rol: number,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    try {
      const offset = (page - 1) * limit;
      let usuarios;
      let totalResult;

      if (rol === 4) {
        usuarios = await this.usuarioRepository.query(
          `${this.usuarioSelect}
ORDER BY u.Id DESC
LIMIT ? OFFSET ?;`,
          [limit, offset],
        );

        totalResult = await this.usuarioRepository.query(
          `SELECT COUNT(*) AS total FROM Usuarios u`,
        );
      } else {
        usuarios = await this.usuarioRepository.query(
          `${this.usuarioSelect}
WHERE u.IdRol != 4
ORDER BY u.Id DESC
LIMIT ? OFFSET ?;`,
          [limit, offset],
        );

        totalResult = await this.usuarioRepository.query(
          `SELECT COUNT(*) AS total
FROM Usuarios u
WHERE u.IdRol != 4`,
        );
      }

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
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al obtener la paginación de usuarios.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAllListUsuarios(
    idGrupo: number,
    rol: number,
  ): Promise<ApiResponseCommon> {
    try {
      let usuarios;

      if (rol === 4) {
        usuarios = await this.usuarioRepository.query(
          `${this.usuarioSelect}
ORDER BY u.Id DESC;`,
        );
      } else {
        usuarios = await this.usuarioRepository.query(
          `${this.usuarioSelect}
WHERE u.IdRol != 4
ORDER BY u.Id DESC;`,
        );
      }

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

  async getAllListUsuariosGrupo(idGrupo: number): Promise<ApiResponseCommon> {
    try {
      const usuarios = await this.usuarioRepository.find({
        where: { estatus: 1, idGrupo },
      });

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

  async getUsuarioByID(id: number, idGrupo: number, rol: number) {
    try {
      let usuarioData;

      if (rol === 1) {
        usuarioData = await this.usuarioRepository.query(
          `${this.usuarioSelectById}
WHERE u.Id = ?
ORDER BY u.Id DESC`,
          [id],
        );
      } else {
        usuarioData = await this.usuarioRepository.query(
          `${this.usuarioSelectById}
WHERE u.Id = ? AND u.IdGrupo = ? AND u.Estatus = 1
ORDER BY u.Id DESC`,
          [id, idGrupo],
        );
      }

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
        idGrupo: createUsuarioDto.idGrupo,
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
        idGrupo: createUsuarioDto.idGrupo,
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
    idUser: string,
    updateUsuarioContrasena: UpdateUsuarioContrasena,
  ) {
    try {
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
