import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindAuditLogDto } from '@patrol/shared';
import { Repository } from 'typeorm';

import { AuditLogEntity } from './entities/audit-log.entity';

export type CreateAuditLogRecord = {
  action: string;
  deviceId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  ipAddress?: string | null;
  meta?: Record<string, unknown> | null;
  userId?: string | null;
};

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLog: Repository<AuditLogEntity>,
  ) {}

  create(data: CreateAuditLogRecord): Promise<AuditLogEntity> {
    return this.auditLog.save(this.auditLog.create(data));
  }

  findById(id: string): Promise<AuditLogEntity | null> {
    return this.auditLog.findOne({
      relations: { user: true },
      where: { id },
    });
  }

  findMany(query: FindAuditLogDto, options: { paginate?: boolean } = {}): Promise<[AuditLogEntity[], number]> {
    const builder = this.auditLog
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user');

    if (options.paginate !== false) {
      builder.skip((query.page - 1) * query.limit).take(query.limit);
    }

    if (query.userId !== undefined) {
      builder.andWhere('audit.user_id = :userId', { userId: query.userId });
    }

    if (query.action !== undefined) {
      builder.andWhere('audit.action = :action', { action: query.action });
    }

    if (query.entityType !== undefined) {
      builder.andWhere('audit.entity_type = :entityType', { entityType: query.entityType });
    }

    if (query.entityId !== undefined) {
      builder.andWhere('audit.entity_id = :entityId', { entityId: query.entityId });
    }

    if (query.from !== undefined) {
      builder.andWhere('audit.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to !== undefined) {
      builder.andWhere('audit.created_at <= :to', { to: new Date(query.to) });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere(
        '(audit.action ILIKE :search OR audit.entity_type ILIKE :search OR CAST(audit.meta AS TEXT) ILIKE :search OR user.full_name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    const [field, direction] = parseSort(query.sort);
    builder.orderBy(`audit.${field}`, direction);

    return builder.getManyAndCount();
  }
}

function parseSort(sort: FindAuditLogDto['sort']): ['createdAt' | 'id', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'id', direction === 'asc' ? 'ASC' : 'DESC'];
}
