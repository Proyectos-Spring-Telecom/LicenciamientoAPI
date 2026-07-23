import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import { EstatusEnum, TipoCodigoAutenticacion } from 'src/common/estatus.enum';
import { CodigoAutenticacion } from 'src/entities/CodigoAutenticacion';
import { RefreshSessions } from 'src/entities/RefreshSessions';
import { Usuarios } from 'src/entities/Usuarios';
import { MailService } from 'src/mail/mail.service';
import { AuthTokensService } from './auth-tokens.service';
import {
  AuthService,
  RECOVERY_CODE_EXPIRATION_MINUTES,
} from './auth.service';

type QueryFn = (
  sql: string,
  parameters?: unknown[],
) => Promise<Record<string, unknown>[]>;

function createUsuariosRepo(user: Usuarios | null) {
  return {
    findOne: jest.fn(async () => user),
    update: jest.fn(async () => undefined),
    query: jest.fn<QueryFn>().mockResolvedValue([]),
  } as unknown as Repository<Usuarios>;
}

function createCodigoRepo(existing: CodigoAutenticacion | null = null) {
  const update = jest.fn(async () => undefined);
  const save = jest.fn(async (entity: CodigoAutenticacion) => ({
    ...entity,
    id: 99,
  }));
  const create = jest.fn((data: Partial<CodigoAutenticacion>) => data);
  return {
    findOne: jest.fn(async () => existing),
    update,
    save,
    create,
  } as unknown as Repository<CodigoAutenticacion> & {
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
  };
}

describe('AuthService.recuperarAccesoConCodigoPorCorreo', () => {
  const usuarioBase = {
    id: 10,
    userName: 'usuario@example.com',
    nombre: 'Juan',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'López',
    estatus: 1,
  } as Usuarios;

  let mailService: {
    sendRecoveryAccessCodeEmail: jest.Mock;
    sendResetPasswordEmail: jest.Mock;
  };
  let codigoRepo: ReturnType<typeof createCodigoRepo>;
  let service: AuthService;

  beforeEach(() => {
    mailService = {
      sendRecoveryAccessCodeEmail: jest
        .fn<() => Promise<void>>()
        .mockResolvedValue(undefined),
      sendResetPasswordEmail: jest
        .fn<() => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    codigoRepo = createCodigoRepo(null);

    service = new AuthService(
      createUsuariosRepo(usuarioBase),
      codigoRepo,
      {} as Repository<RefreshSessions>,
      { sign: jest.fn(() => 'jwt-token') } as unknown as JwtService,
      {} as AuthTokensService,
      mailService as unknown as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('usuario válido: guarda código, envía correo con el mismo código y no lo expone', async () => {
    const result = await service.recuperarAccesoConCodigoPorCorreo({
      userName: 'usuario@example.com',
    });

    expect(codigoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: 10,
        codigo: '5500',
        tipo: TipoCodigoAutenticacion.RECUPERACION_CONTRASENA,
        usado: EstatusEnum.INACTIVO,
        estatus: EstatusEnum.ACTIVO,
      }),
    );
    expect(codigoRepo.save).toHaveBeenCalledTimes(1);
    expect(mailService.sendRecoveryAccessCodeEmail).toHaveBeenCalledTimes(1);
    expect(mailService.sendRecoveryAccessCodeEmail).toHaveBeenCalledWith({
      to: 'usuario@example.com',
      code: '5500',
      expirationMinutes: RECOVERY_CODE_EXPIRATION_MINUTES,
      displayName: 'Juan Pérez López',
    });
    expect(result).toEqual({
      status: 'success',
      message:
        'Si la cuenta existe y tiene un correo asociado, se enviará un código de recuperación.',
      data: null,
    });
    expect(JSON.stringify(result)).not.toContain('5500');
    expect(mailService.sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it('usuario inexistente: respuesta genérica sin envío ni persistencia', async () => {
    service = new AuthService(
      createUsuariosRepo(null),
      codigoRepo,
      {} as Repository<RefreshSessions>,
      {} as JwtService,
      {} as AuthTokensService,
      mailService as unknown as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    const result = await service.recuperarAccesoConCodigoPorCorreo({
      userName: 'noexiste@example.com',
    });

    expect(result.message).toContain('Si la cuenta existe');
    expect(mailService.sendRecoveryAccessCodeEmail).not.toHaveBeenCalled();
    expect(codigoRepo.save).not.toHaveBeenCalled();
    expect(codigoRepo.update).not.toHaveBeenCalled();
  });

  it('usuario sin correo útil: no envía correo', async () => {
    service = new AuthService(
      createUsuariosRepo({
        ...usuarioBase,
        userName: '   ',
      } as Usuarios),
      codigoRepo,
      {} as Repository<RefreshSessions>,
      {} as JwtService,
      {} as AuthTokensService,
      mailService as unknown as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    // findOne with estatus+userName won't match empty after trim on input;
    // simulate user found with blank email by stubbing findOne after normalize
    const usuariosRepo = createUsuariosRepo({
      ...usuarioBase,
      userName: '   ',
    } as Usuarios);
    (usuariosRepo.findOne as jest.Mock).mockResolvedValue({
      ...usuarioBase,
      userName: '   ',
    });
    service = new AuthService(
      usuariosRepo,
      codigoRepo,
      {} as Repository<RefreshSessions>,
      {} as JwtService,
      {} as AuthTokensService,
      mailService as unknown as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    const result = await service.recuperarAccesoConCodigoPorCorreo({
      userName: 'usuario@example.com',
    });

    expect(result.message).toContain('Si la cuenta existe');
    expect(mailService.sendRecoveryAccessCodeEmail).not.toHaveBeenCalled();
    expect(codigoRepo.save).not.toHaveBeenCalled();
  });

  it('error SMTP: invalida el código y no expone el valor', async () => {
    mailService.sendRecoveryAccessCodeEmail.mockRejectedValue(
      new Error('SMTP down'),
    );

    await expect(
      service.recuperarAccesoConCodigoPorCorreo({
        userName: 'usuario@example.com',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(codigoRepo.update).toHaveBeenCalledWith(
      { idUsuario: 10 },
      {
        usado: EstatusEnum.ACTIVO,
        estatus: EstatusEnum.INACTIVO,
      },
    );
  });

  it('endpoint original recuperarContrasena conserva su flujo', async () => {
    const result = await service.recuperarContrasena({
      userName: 'usuario@example.com',
    });

    expect(result).toBe('Se ha enviado un correo con el codigo.');
    expect(mailService.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
    expect(mailService.sendRecoveryAccessCodeEmail).not.toHaveBeenCalled();
  });

  it('endpoint original lanza BadRequest si el usuario no existe', async () => {
    service = new AuthService(
      createUsuariosRepo(null),
      codigoRepo,
      {} as Repository<RefreshSessions>,
      { sign: jest.fn(() => 'jwt') } as unknown as JwtService,
      {} as AuthTokensService,
      mailService as unknown as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    await expect(
      service.recuperarContrasena({ userName: 'x@y.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuthService.verifyUser', () => {
  it('valida código de recuperación y responde con token JWT_CONFIRMACION', async () => {
    const fechaExpiracion = new Date(Date.now() + 60 * 60 * 1000);
    const codigoRepo = {
      findOne: jest.fn(async () => ({
        id: 5,
        idUsuario: 10,
        codigo: '4821',
        tipo: TipoCodigoAutenticacion.RECUPERACION_CONTRASENA,
        usado: EstatusEnum.INACTIVO,
        fechaExpiracion,
      })),
      update: jest.fn(async () => undefined),
    };
    const sign = jest.fn(() => 'token-confirmacion');
    const bitacoraLogger = {
      logToBitacora: jest.fn(async () => undefined),
    };
    const usuariosUpdate = jest.fn(async () => undefined);

    const service = new AuthService(
      {
        findOne: jest.fn(async () => ({
          id: 10,
          userName: 'usuario@example.com',
          nombre: 'Juan',
        })),
        update: usuariosUpdate,
      } as unknown as Repository<Usuarios>,
      codigoRepo as unknown as Repository<CodigoAutenticacion>,
      {} as Repository<RefreshSessions>,
      { sign } as unknown as JwtService,
      {} as AuthTokensService,
      {} as MailService,
      bitacoraLogger as unknown as BitacoraLoggerService,
      {} as DataSource,
    );

    const result = await service.verifyUser({ codigo: '4821' });

    expect(result).toEqual({ token: 'token-confirmacion' });
    expect(sign).toHaveBeenCalledWith(
      {
        id: 10,
        email: 'usuario@example.com',
        type: 'access',
      },
      { expiresIn: `${process.env.JWT_CONFIRMACION}` },
    );
    expect(usuariosUpdate).not.toHaveBeenCalled();
    expect(codigoRepo.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        usado: EstatusEnum.ACTIVO,
        estatus: EstatusEnum.INACTIVO,
      }),
    );
  });
});

describe('AuthService.cambiarPasswordPorToken', () => {
  it('cambia la contraseña usando el userId del token', async () => {
    const update = jest.fn(async () => undefined);
    const bitacoraLogger = {
      logToBitacora: jest.fn(async () => undefined),
    };
    const revoke = jest.fn(async () => undefined);
    const service = new AuthService(
      {
        findOne: jest.fn(async () => ({
          id: 10,
          userName: 'usuario@example.com',
          nombre: 'Juan',
          estatus: 1,
        })),
        update,
      } as unknown as Repository<Usuarios>,
      {} as Repository<CodigoAutenticacion>,
      {} as Repository<RefreshSessions>,
      {} as JwtService,
      {} as AuthTokensService,
      {} as MailService,
      bitacoraLogger as unknown as BitacoraLoggerService,
      {} as DataSource,
    );
    jest
      .spyOn(service, 'revokeAllRefreshSessionsForUser')
      .mockImplementation(revoke as never);

    const result = await service.cambiarPasswordPorToken(10, {
      passwordNueva: 'P@ssw0rd!',
      passwordConfirmacion: 'P@ssw0rd!',
    });

    expect(result).toEqual({
      status: 'success',
      message: 'La contraseña ha sido actualizada exitosamente.',
    });
    expect(update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(revoke).toHaveBeenCalledWith(10);
  });

  it('rechaza si passwordNueva y passwordConfirmacion no coinciden', async () => {
    const service = new AuthService(
      {} as Repository<Usuarios>,
      {} as Repository<CodigoAutenticacion>,
      {} as Repository<RefreshSessions>,
      {} as JwtService,
      {} as AuthTokensService,
      {} as MailService,
      {} as BitacoraLoggerService,
      {} as DataSource,
    );

    await expect(
      service.cambiarPasswordPorToken(10, {
        passwordNueva: 'P@ssw0rd!',
        passwordConfirmacion: 'P@ssw0rd?',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('MailService recovery email builders (vía método público)', () => {
  it('incluye el código en HTML y texto plano, no en el asunto', async () => {
    const sendMail = jest
      .fn<() => Promise<{ messageId: string }>>()
      .mockResolvedValue({ messageId: '1' });

    const service = Object.create(MailService.prototype) as MailService;
    (
      service as unknown as { transporter: { sendMail: typeof sendMail } }
    ).transporter = { sendMail };
    (
      service as unknown as {
        configService: { get: (key: string) => string | number };
      }
    ).configService = {
      get: () => 'x',
    };

    await service.sendRecoveryAccessCodeEmail({
      to: 'usuario@example.com',
      code: '482193',
      expirationMinutes: 15,
      displayName: 'Ana',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const payload = sendMail.mock.calls[0][0] as {
      subject: string;
      html: string;
      text: string;
      to: string;
    };
    expect(payload.to).toBe('usuario@example.com');
    expect(payload.subject).toBe('Código de recuperación de acceso');
    expect(payload.subject).not.toContain('482193');
    expect(payload.html).toContain('482193');
    expect(payload.html).toContain('15 minutos');
    expect(payload.html).toContain('#021d6a');
    expect(payload.html).toContain('#691330');
    expect(payload.html).toContain('spring_white.png');
    expect(payload.html).toContain('Spring Telecom');
    expect(payload.text).toContain('Tu código de autenticación es: 482193');
    expect(payload.text).toContain('expira en 15 minutos');
  });
});
