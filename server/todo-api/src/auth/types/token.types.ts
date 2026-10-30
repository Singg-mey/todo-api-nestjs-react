export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface BaseJwtPayload {
  sub: number;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends BaseJwtPayload {
  type: TokenType.ACCESS;
}

export interface RefreshTokenPayload extends BaseJwtPayload {
  type: TokenType.REFRESH;
}

export type JwtPayload = AccessTokenPayload;

export interface TokensResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name?: string;
    role: string;
  };
}
