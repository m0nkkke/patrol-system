import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { AppConfig } from '../../../config/app.config';
import {
  ReportOutboxRepository,
  ReportOutboxStatsRaw,
} from './report-outbox.repository';

type ReportOutboxMonitoringResponse = {
  checkedAt: string;
  config: {
    batchSize: number;
    publishEnabled: boolean;
    publishIntervalMs: number;
    transport: string;
  };
  counters: {
    failed: number;
    pending: number;
    ready: number;
    sent: number;
    total: number;
  };
  lag: {
    oldestUnsentCreatedAt: string | null;
    oldestUnsentSeconds: number | null;
  };
  lastSentAt: string | null;
  schemaVersion: '1.0';
  sourceService: 'patrol';
};

@Injectable()
export class ReportOutboxMonitoringService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly outboxRepository: ReportOutboxRepository,
  ) {}

  async getStatus(actor: AuthenticatedUser): Promise<ReportOutboxMonitoringResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'REPORT_OUTBOX_MONITORING_FORBIDDEN',
        'User cannot access report outbox monitoring',
      );
    }

    const checkedAt = new Date();
    const raw = await this.outboxRepository.getStats(checkedAt);
    const oldestUnsentCreatedAt = toDate(raw.oldest_unsent_created_at);
    const lastSentAt = toDate(raw.last_sent_at);

    return {
      checkedAt: checkedAt.toISOString(),
      config: {
        batchSize: this.configService.get('reportingCore.batchSize', { infer: true }),
        publishEnabled: this.configService.get('reportingCore.publishEnabled', { infer: true }),
        publishIntervalMs: this.configService.get('reportingCore.publishIntervalMs', {
          infer: true,
        }),
        transport: this.configService.get('reportingCore.transport', { infer: true }),
      },
      counters: {
        failed: toNumber(raw.failed_count),
        pending: toNumber(raw.pending_count),
        ready: toNumber(raw.ready_count),
        sent: toNumber(raw.sent_count),
        total: toNumber(raw.total_count),
      },
      lag: {
        oldestUnsentCreatedAt: oldestUnsentCreatedAt?.toISOString() ?? null,
        oldestUnsentSeconds:
          oldestUnsentCreatedAt === null
            ? null
            : Math.max(0, Math.floor((checkedAt.getTime() - oldestUnsentCreatedAt.getTime()) / 1000)),
      },
      lastSentAt: lastSentAt?.toISOString() ?? null,
      schemaVersion: '1.0',
      sourceService: 'patrol',
    };
  }
}

function toDate(value: ReportOutboxStatsRaw['last_sent_at']): Date | null {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function toNumber(value: string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}
