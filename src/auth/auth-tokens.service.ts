import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { Usuarios } from 'src/entities/Usuarios';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  buildAccessPayload(user: Usuarios): AccessTokenPayload {
    return {
      id: Number(user.id),
      email: user.userName ?? user.email ?? '',
      idGrupo: user.idGrupo != null ? Number(user.idGrupo) : null,
      rol: user.idRol != null ? Number(user.idRol) : null,
      type: 'access',
    };
  }

  signAccessToken(user: Usuarios): string {
    return this.jwtService.sign(this.buildAccessPayload(user), {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }

  signRefreshToken(userId: number): {
    token: string;
    jti: string;
    expiresAt: Date;
  } {
    const jti = randomUUID();
    const token = this.jwtService.sign(
      {
        id: Number(userId),
        type: 'refresh',
        jti,
      } satisfies RefreshTokenPayload,
      {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return {
      token,
      jti,
      expiresAt: this.getExpiresAtFromToken(token),
    };
  }

  getExpiresAtFromToken(token: string): Date {
    const decoded = this.jwtService.decode(token) as { exp: number } | null;
    if (!decoded?.exp) {
      throw new Error('No se pudo obtener la expiración del token');
    }
    return new Date(decoded.exp * 1000);
  }
}
