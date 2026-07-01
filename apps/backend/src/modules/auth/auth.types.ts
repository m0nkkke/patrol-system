import { UserRole } from '@patrol/shared';

export type JwtPayload = {
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
