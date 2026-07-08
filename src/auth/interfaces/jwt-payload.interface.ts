export type JwtTokenType = 'access' | 'refresh';

export interface AccessTokenPayload {
  id: number;
  email: string;
  idGrupo: number | null;
  rol: number | null;
  type: 'access';
}

export interface RefreshTokenPayload {
  id: number;
  type: 'refresh';
  jti: string;
}
