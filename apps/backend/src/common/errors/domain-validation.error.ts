import { DomainError } from './domain.error';

export class DomainValidationError extends DomainError {
  constructor(code: string, message: string) {
    super(message, code);
  }
}
