import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Usuarios } from 'src/entities/Usuarios';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { MailService } from 'src/mail/mail.service';
import { LoginAuthConfirmacionDto } from './dto/login-confirmacion.dto';
import { LoginAuthResetDto } from './dto/login-recuperacion.dto';
import { CambiarPasswordRecuperacionDto } from './dto/cambiar-password-recuperacion.dto';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import { EstatusEnumBitcora } from 'src/common/ApiResponse';
import { CodigoAutenticacion } from 'src/entities/CodigoAutenticacion';
import { EstatusEnum, TipoCodigoAutenticacion } from 'src/common/estatus.enum';
import { CodigoPasajeroAutenticacion } from './dto/login-autenticacion.dto';
import { RefreshSessions } from 'src/entities/RefreshSessions';
import { AuthTokensService } from './auth-tokens.service';
import { RefreshTokenPayload } from './interfaces/jwt-payload.interface';

/** Vigencia del código en `generarCodigo` (15 minutos). */
export const RECOVERY_CODE_EXPIRATION_MINUTES = 15;

const RECOVERY_CODE_PUBLIC_MESSAGE =
  'Si la cuenta existe y tiene un correo asociado, se enviará un código de recuperación.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
    @InjectRepository(CodigoAutenticacion)
    private readonly codigoAutenticacioRepository: Repository<CodigoAutenticacion>,
    @InjectRepository(RefreshSessions)
    private readonly refreshSessionsRepository: Repository<RefreshSessions>,
    private readonly jwtService: JwtService,
    private readonly authTokensService: AuthTokensService,
    private readonly emailService: MailService,
    private readonly bitacoraLogger: BitacoraLoggerService,
    private readonly dataSource: DataSource,
  ) { }

  async signIn(loginAuthDto: LoginAuthDto) {
    const user = await this.usuariosRepository.findOne({
      where: {
        userName: loginAuthDto.username,
        estatus: 1,
        emailConfirmed: 1,
      },
    });

    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(loginAuthDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ahora = new Date();
    await this.usuariosRepository.update(user.id, { ultimoLogin: ahora });
    user.ultimoLogin = ahora;

    const token = this.authTokensService.signAccessToken(user);
    const refresh = this.authTokensService.signRefreshToken(user.id);

    await this.refreshSessionsRepository.save({
      idUsuario: user.id,
      jti: refresh.jti,
      tokenHash: this.authTokensService.hashRefreshToken(refresh.token),
      expiresAt: refresh.expiresAt,
      revokedAt: null,
      replacedById: null,
    });



    return {
      token,
      refreshToken: refresh.token,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (payload.type !== 'refresh' || !payload.jti || !payload.id) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokenHash = this.authTokensService.hashRefreshToken(refreshToken);
    const session = await this.refreshSessionsRepository.findOne({
      where: {
        jti: payload.jti,
        idUsuario: payload.id,
      },
    });

    if (
      !session ||
      session.revokedAt != null ||
      session.tokenHash !== tokenHash ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Sesión de refresh inválida o revocada');
    }

    const user = await this.usuariosRepository.findOne({
      where: { id: payload.id, estatus: 1 },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const token = this.authTokensService.signAccessToken(user);
    const refresh = this.authTokensService.signRefreshToken(user.id);

    await this.dataSource.transaction(async (manager) => {
      const newSession = await manager.save(RefreshSessions, {
        idUsuario: user.id,
        jti: refresh.jti,
        tokenHash: this.authTokensService.hashRefreshToken(refresh.token),
        expiresAt: refresh.expiresAt,
        revokedAt: null,
        replacedById: null,
      });

      await manager.update(RefreshSessions, session.id, {
        revokedAt: new Date(),
        replacedById: newSession.id,
      });
    });

    return {
      token,
      refreshToken: refresh.token,
    };
  }

  async logoutRefresh(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      return { message: 'Sesión cerrada' };
    }

    if (payload.type !== 'refresh' || !payload.jti || !payload.id) {
      return { message: 'Sesión cerrada' };
    }

    const tokenHash = this.authTokensService.hashRefreshToken(refreshToken);
    const session = await this.refreshSessionsRepository.findOne({
      where: {
        jti: payload.jti,
        idUsuario: payload.id,
      },
    });

    if (
      session &&
      session.revokedAt == null &&
      session.tokenHash === tokenHash
    ) {
      await this.refreshSessionsRepository.update(session.id, {
        revokedAt: new Date(),
      });
    }

    return { message: 'Sesión cerrada' };
  }

  async getMe(userId: number) {
    const user = await this.usuariosRepository.findOne({
      relations: ['idRol2', 'idGrupo2'],
      where: { id: userId, estatus: 1 },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const permisosRows = user.idRol
      ? await this.usuariosRepository.query(
        `SELECT rp.IdPermiso AS idPermiso
           FROM RolesPermisos rp
           INNER JOIN Permisos p ON p.Id = rp.IdPermiso
           WHERE rp.IdRol = ? AND p.Estatus = 1`,
        [user.idRol],
      )
      : [];

    const permisos = permisosRows.map((row: { idPermiso: number }) =>
      String(row.idPermiso),
    );

    const nombre = user.nombre ?? '';
    const apellidoPaterno = user.apellidoPaterno ?? '';
    const apellidoMaterno = user.apellidoMaterno ?? '';
    const nombreCompleto = [nombre, apellidoPaterno, apellidoMaterno]
      .filter((part) => part.trim().length > 0)
      .join(' ');

    return {
      id: Number(user.id),
      nombre: user.nombre,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      nombreCompleto,
      UserName: user.userName ?? null,
      PhoneNumber: user.phoneNumber ?? null,
      permisos,
      logo: null,
      nombreRol: user.idRol2?.nombre ?? null,
      nombreGrupo: user.idGrupo2?.nombre ?? null,
      ultimoLogin: user.ultimoLogin ?? null,
    };
  }

  async revokeAllRefreshSessionsForUser(userId: number): Promise<void> {
    await this.refreshSessionsRepository
      .createQueryBuilder()
      .update(RefreshSessions)
      .set({ revokedAt: new Date() })
      .where('IdUsuario = :userId', { userId })
      .andWhere('RevokedAt IS NULL')
      .execute();
  }

  async verifyUser(codigoPasajeroAutenticacion: CodigoPasajeroAutenticacion) {
    try {
      const codigoValido = await this.codigoAutenticacioRepository.findOne({
        where: {
          codigo: codigoPasajeroAutenticacion.codigo,
          tipo: TipoCodigoAutenticacion.RECUPERACION_CONTRASENA,
          usado: EstatusEnum.INACTIVO,
        },
      });

      if (!codigoValido) {
        throw new BadRequestException('Código inválido o ya usado');
      }

      const user = await this.usuariosRepository.findOne({
        where: { id: codigoValido.idUsuario },
      });
      if (!user) throw new BadRequestException('Usuario no encontrado');

      function pad(n: number) {
        return n < 10 ? '0' + n : n;
      }

      const ahora = new Date();
      const desfaseMs = -6 * 60 * 60 * 1000;
      const fechaDesfasada = new Date(ahora.getTime() + desfaseMs);

      const fechaActual = `${fechaDesfasada.getFullYear()}-${pad(fechaDesfasada.getMonth() + 1)}-${pad(fechaDesfasada.getDate())} ${pad(fechaDesfasada.getHours())}:${pad(fechaDesfasada.getMinutes())}:${pad(fechaDesfasada.getSeconds())}`;

      if (fechaDesfasada > codigoValido.fechaExpiracion) {
        throw new BadRequestException('El código ha expirado');
      }

      await this.codigoAutenticacioRepository.update(codigoValido.id, {
        usado: EstatusEnum.ACTIVO,
        estatus: EstatusEnum.INACTIVO,
        fechaUso: fechaActual,
      });

      const payload = {
        id: user.id,
        email: user.userName,
        type: 'access' as const,
      };

      const token = this.jwtService.sign(payload, {
        expiresIn: `${process.env.JWT_CONFIRMACION}`,
      });

      const querylogger = { id: user.id };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se verificó el código de recuperación del usuario: ${user.nombre}`,
        'UPDATE',
        querylogger,
        Number(user.id),
        2,
        EstatusEnumBitcora.SUCCESS,
      );

      return { token };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al verificar el código de autenticación.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async recuperarContrasena(
    loginAuthConfirmacionDto: LoginAuthConfirmacionDto,
  ) {
    try {
      const user = await this.usuariosRepository.findOne({
        where: { userName: loginAuthConfirmacionDto.userName },
      });
      if (!user) throw new BadRequestException('Usuario no encontrado');

      const codigo = await this.generarCodigo(
        user.id,
        TipoCodigoAutenticacion.RECUPERACION_CONTRASENA,
      );

      const payload = {
        id: user.id,
        email: user.userName,
        type: 'access',
      };

      const token = this.jwtService.sign(payload, {
        expiresIn: `${process.env.JWT_CONFIRMACION}`,
      });
      const name = `${user.nombre} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
      const emailDestino = user.userName;
      if (!emailDestino) {
        throw new BadRequestException('El usuario no tiene correo registrado.');
      }
      console.log('emailDestino', emailDestino);

      await this.emailService.sendResetPasswordEmail(
        emailDestino,
        name,
        token,
        codigo,
      );
      return `Se ha enviado un correo con el codigo.`;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al recuperar contraseña del usuario.' + error,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Flujo adicional: genera el código con la lógica actual, lo guarda y lo
   * envía en el cuerpo del correo. No modifica `recuperarContrasena`.
   * La respuesta no incluye el código.
   */
  async recuperarAccesoConCodigoPorCorreo(
    loginAuthConfirmacionDto: LoginAuthConfirmacionDto,
  ): Promise<{ status: string; message: string; data: null }> {
    const userName = String(loginAuthConfirmacionDto.userName ?? '').trim();
    const safeResponse = {
      status: 'success',
      message: RECOVERY_CODE_PUBLIC_MESSAGE,
      data: null,
    };

    try {
      if (!userName) {
        return safeResponse;
      }

      const user = await this.usuariosRepository.findOne({
        where: { userName, estatus: 1 },
      });

      if (!user) {
        return safeResponse;
      }

      const emailDestino = this.resolveUsuarioEmail(user);
      if (!emailDestino) {
        this.logger.warn(
          `Solicitud de recuperación por código sin correo útil (usuarioId=${user.id}).`,
        );
        return safeResponse;
      }

      const codigo = await this.generarCodigo(
        user.id,
        TipoCodigoAutenticacion.RECUPERACION_CONTRASENA,
      );

      try {
        await this.emailService.sendRecoveryAccessCodeEmail({
          to: emailDestino,
          code: codigo,
          expirationMinutes: RECOVERY_CODE_EXPIRATION_MINUTES,
          displayName: this.buildUsuarioDisplayName(user),
        });
      } catch (mailError) {
        await this.invalidateUsuarioCodigo(user.id);
        this.logger.error(
          `Error al enviar correo de recuperación (usuarioId=${user.id}).`,
          mailError instanceof Error ? mailError.stack : String(mailError),
        );
        throw new InternalServerErrorException(
          'No fue posible enviar el código de recuperación. Intente de nuevo más tarde.',
        );
      }

      this.logger.log(
        `Correo de recuperación por código enviado (usuarioId=${user.id}).`,
      );

      return safeResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al recuperar acceso del usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async generarCodigo(idUsuario: number, tipo: number): Promise<string> {
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();

    const ahora = new Date();
    const desfaseMs = -6 * 60 * 60 * 1000;
    const expiracionMs = RECOVERY_CODE_EXPIRATION_MINUTES * 60 * 1000;
    const expiracion = new Date(ahora.getTime() + expiracionMs + desfaseMs);

    const codigoExiste = await this.codigoAutenticacioRepository.findOne({
      where: { idUsuario },
    });

    if (codigoExiste) {
      await this.codigoAutenticacioRepository.update(codigoExiste.id, {
        codigo,
        tipo,
        fechaCreacion: ahora,
        fechaExpiracion: expiracion,
        usado: EstatusEnum.INACTIVO,
        estatus: EstatusEnum.ACTIVO,
        fechaUso: null,
      });
    } else {
      const codigoCreate = this.codigoAutenticacioRepository.create({
        idUsuario,
        codigo,
        tipo,
        fechaExpiracion: expiracion,
        usado: EstatusEnum.INACTIVO,
        estatus: EstatusEnum.ACTIVO,
      });
      await this.codigoAutenticacioRepository.save(codigoCreate);
    }

    return codigo;
  }

  /**
   * Destinatario = UserName almacenado (no hay columna Email separada).
   * No aceptar correo enviado por el cliente.
   */
  private resolveUsuarioEmail(user: Usuarios): string | null {
    const email = user.userName != null ? String(user.userName).trim() : '';
    return email.length > 0 ? email : null;
  }

  private buildUsuarioDisplayName(user: Usuarios): string | null {
    const partes = [user.nombre, user.apellidoPaterno, user.apellidoMaterno]
      .map((part) => (part != null ? String(part).trim() : ''))
      .filter((part) => part.length > 0);
    return partes.length > 0 ? partes.join(' ') : null;
  }

  private async invalidateUsuarioCodigo(idUsuario: number): Promise<void> {
    await this.codigoAutenticacioRepository.update(
      { idUsuario },
      {
        usado: EstatusEnum.ACTIVO,
        estatus: EstatusEnum.INACTIVO,
      },
    );
  }

  async recuperarConfirmacion(
    loginAuthConfirmacionDto: LoginAuthConfirmacionDto,
  ) {
    try {
      const user = await this.usuariosRepository.findOne({
        where: { userName: loginAuthConfirmacionDto.userName },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado.');

      const codigo = await this.generarCodigo(
        user.id,
        TipoCodigoAutenticacion.CONFIRMACION_CORREO,
      );

      const payload = {
        id: user.id,
        email: user.userName,
        type: 'access',
      };
      const token = this.jwtService.sign(payload, {
        expiresIn: `${process.env.JWT_CONFIRMACION}`,
      });
      const name = `${user.nombre} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
      const emailDestino = user.userName;
      if (!emailDestino) {
        throw new BadRequestException('El usuario no tiene correo registrado.');
      }
      await this.emailService.sendConfirmationEmail(
        emailDestino,
        name,
        token,
        codigo,
      );
      return `Se ha enviado un correo con el codigo de autenticación.`;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al confirmar el usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async resetPassword(loginAuthResetDto: LoginAuthResetDto) {
    try {
      const user = await this.usuariosRepository.findOne({
        where: { userName: loginAuthResetDto.userName },
      });
      if (!user) throw new BadRequestException('Usuario no encontrado');

      const hashedPassword = await bcrypt.hash(loginAuthResetDto.password, 10);
      await this.usuariosRepository.update(user.id, {
        passwordHash: hashedPassword,
      });

      await this.revokeAllRefreshSessionsForUser(user.id);

      const querylogger = { id: user.id, EmailConfirmado: 1 };
      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se actualizo la contraseña del usuarios con ID: ${user.id}`,
        'CREATE',
        querylogger,
        Number(user.id),
        2,
        EstatusEnumBitcora.SUCCESS,
      );
      return `La contraseña del usuario ${user.nombre} ha sido actualizada exitosamente.`;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al actualizar contraseña del usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Restablece la contraseña del usuario autenticado vía JWT de recuperación.
   * Independiente de `resetPassword` (no usa userName del body).
   */
  async cambiarPasswordPorToken(
    userId: number,
    dto: CambiarPasswordRecuperacionDto,
  ): Promise<{ status: string; message: string }> {
    try {
      if (dto.passwordNueva !== dto.passwordConfirmacion) {
        throw new BadRequestException(
          'passwordNueva y passwordConfirmacion no coinciden',
        );
      }

      if (
        userId === undefined ||
        userId === null ||
        !Number.isInteger(Number(userId)) ||
        Number(userId) < 1
      ) {
        throw new UnauthorizedException('Token de acceso inválido');
      }

      const idUsuario = Number(userId);
      const user = await this.usuariosRepository.findOne({
        where: { id: idUsuario, estatus: 1 },
      });
      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      const hashedPassword = await bcrypt.hash(dto.passwordNueva, 10);
      await this.usuariosRepository.update(user.id, {
        passwordHash: hashedPassword,
      });

      await this.revokeAllRefreshSessionsForUser(user.id);

      await this.bitacoraLogger.logToBitacora(
        'Usuarios',
        `Se restableció la contraseña por recuperación del usuario con ID: ${user.id}`,
        'UPDATE',
        { id: user.id },
        Number(user.id),
        2,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'La contraseña ha sido actualizada exitosamente.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al restablecer la contraseña del usuario.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
