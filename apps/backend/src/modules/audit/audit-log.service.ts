import { Injectable, Logger } from '@nestjs/common';
import { FindAuditLogDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { AuditLogRepository, CreateAuditLogRecord } from './audit-log.repository';
import { AuditLogEntity } from './entities/audit-log.entity';

type PaginatedAuditLog = {
  items: AuditLogEntity[];
  limit: number;
  page: number;
  total: number;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async record(data: CreateAuditLogRecord): Promise<AuditLogEntity> {
    return this.auditLogRepository.create(data);
  }

  async recordSafely(data: CreateAuditLogRecord): Promise<void> {
    try {
      await this.record(data);
    } catch (error: unknown) {
      if (data.userId != null && isForeignKeyViolation(error)) {
        try {
          await this.record({
            ...data,
            meta: {
              ...(data.meta ?? {}),
              unresolvedUserId: data.userId,
            },
            userId: null,
          });
          return;
        } catch (retryError: unknown) {
          this.logWriteFailure(retryError);
          return;
        }
      }

      this.logWriteFailure(error);
    }
  }

  async findMany(query: FindAuditLogDto, actor: AuthenticatedUser): Promise<PaginatedAuditLog> {
    assertCanAccessAuditLog(actor);
    const [items, total] = await this.auditLogRepository.findMany(query);

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findForExport(query: FindAuditLogDto, actor: AuthenticatedUser): Promise<AuditLogEntity[]> {
    assertCanAccessAuditLog(actor);
    const [items] = await this.auditLogRepository.findMany(query, { paginate: false });

    return items;
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<AuditLogEntity> {
    assertCanAccessAuditLog(actor);
    const auditLog = await this.auditLogRepository.findById(id);

    if (auditLog === null) {
      throw new EntityNotFoundError('AuditLog', id);
    }

    return auditLog;
  }

  private logWriteFailure(error: unknown): void {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    this.logger.error('Failed to write audit log event', message);
  }
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23503'
  );
}

function assertCanAccessAuditLog(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin') {
    throw new DomainValidationError(
      'AUDIT_LOG_FORBIDDEN',
      'User cannot access audit log',
    );
  }
}
