import { DomainError } from './domain.error';

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string, code = 'ENTITY_NOT_FOUND') {
    super(`${entityName} not found: ${id}`, code);
  }
}
