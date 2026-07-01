import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';

import { AppConfig } from '../../config/app.config';
import { JwtPayload } from '../../modules/auth/auth.types';
import { UsersService } from '../../modules/users/users.service';
import { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (token === undefined) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = verifyJwtPayload(
      token,
      this.configService.get('jwt.accessSecret', { infer: true }),
    );
    const user = await this.usersService.findEntityById(payload.sub);

    if (
      user === null ||
      !user.isActive ||
      user.sessionVersion !== payload.sessionVersion
    ) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    request.user = {
      fullName: user.fullName,
      id: user.id,
      role: user.role,
      shop: user.shop,
      shopId: user.shopId ?? undefined,
      shopIds: user.shops?.map((shop) => shop.id) ?? (user.shopId == null ? [] : [user.shopId]),
      shops: user.shops,
      username: user.username,
    };

    return true;
  }
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
    return undefined;
  }

  return token;
}

function verifyJwtPayload(token: string, secret: string): JwtPayload {
  let payload: unknown;

  try {
    payload = verify(token, secret);
  } catch {
    throw new UnauthorizedException('Invalid bearer token');
  }

  if (!isJwtPayload(payload)) {
    throw new UnauthorizedException('Invalid token payload');
  }

  return payload;
}

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'sub' in payload &&
    'role' in payload &&
    'username' in payload &&
    'sessionVersion' in payload &&
    typeof payload.sub === 'string' &&
    typeof payload.role === 'string' &&
    typeof payload.sessionVersion === 'number' &&
    typeof payload.username === 'string'
  );
}
