import { UserRole } from '@patrol/shared';

export type JwtPayload = {
  role: UserRole;
  sub: string;
  username: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
