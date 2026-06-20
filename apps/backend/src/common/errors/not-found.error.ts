import { DomainError } from './domain.error';

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} not found: ${id}`, 'ENTITY_NOT_FOUND');
  }
}
