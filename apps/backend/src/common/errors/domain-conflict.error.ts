import { DomainError } from './domain.error';

export class DomainConflictError extends DomainError {
  constructor(code: string, message: string) {
    super(message, code);
  }
}
