import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthenticatedUser } from '../auth/authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user === undefined) {
      throw new Error('CurrentUser decorator requires JwtAuthGuard');
    }

    return request.user;
  },
);
