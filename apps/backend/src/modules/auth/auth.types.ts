import { UserRole } from '@patrol/shared';

export type JwtPayload = {
  authorizationFullName?: string;
  authorizationId?: string;
  role: UserRole;
  sessionVersion: number;
  sub: string;
  username: string;
  iat?: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
