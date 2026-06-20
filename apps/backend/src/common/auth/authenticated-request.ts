import { Request } from 'express';

import { AuthenticatedUser } from './authenticated-user';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
