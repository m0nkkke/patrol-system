import { DomainError } from './domain.error';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid access key', 'INVALID_CREDENTIALS');
  }
}
