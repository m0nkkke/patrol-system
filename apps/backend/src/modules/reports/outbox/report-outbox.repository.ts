import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReportOutboxEventEntity } from '../entities/report-outbox-event.entity';

type CreateReportOutboxEventRecord = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  schemaVersion: string;
  sourceService: string;
};

export type ReportOutboxStatsRaw = {
  failed_count: string | null;
  last_sent_at: Date | string | null;
  oldest_unsent_created_at: Date | string | null;
  pending_count: string | null;
  ready_count: string | null;
  sent_count: string | null;
  total_count: string | null;
};

@Injectable()
export class ReportOutboxRepository {
  constructor(
    @InjectRepository(ReportOutboxEventEntity)
    private readonly events: Repository<ReportOutboxEventEntity>,
  ) {}

  create(data: CreateReportOutboxEventRecord): Promise<ReportOutboxEventEntity> {
    return this.events.save(this.events.create(data));
  }

  findReadyToPublish(now: Date, limit: number): Promise<ReportOutboxEventEntity[]> {
    return this.events
      .createQueryBuilder('event')
      .where('event.status IN (:...statuses)', { statuses: ['pending', 'failed'] })
      .andWhere('(event.next_attempt_at IS NULL OR event.next_attempt_at <= :now)', { now })
      .orderBy('event.created_at', 'ASC')
      .limit(limit)
      .getMany();
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.events.update(id, {
      nextAttemptAt: null,
      sentAt,
      status: 'sent',
    });
  }

  async markFailed(id: string, attemptCount: number, nextAttemptAt: Date): Promise<void> {
    await this.events.update(id, {
      attemptCount,
      nextAttemptAt,
      status: 'failed',
    });
  }

  async getStats(now: Date): Promise<ReportOutboxStatsRaw> {
    const [raw] = await this.events.query<ReportOutboxStatsRaw[]>(
      `
      SELECT
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
        COUNT(*) FILTER (
          WHERE status IN ('pending', 'failed')
            AND (next_attempt_at IS NULL OR next_attempt_at <= $1)
        ) AS ready_count,
        MIN(created_at) FILTER (WHERE status IN ('pending', 'failed')) AS oldest_unsent_created_at,
        MAX(sent_at) FILTER (WHERE status = 'sent') AS last_sent_at
      FROM report_outbox_events
      `,
      [now],
    );

    return (
      raw ?? {
        failed_count: '0',
        last_sent_at: null,
        oldest_unsent_created_at: null,
        pending_count: '0',
        ready_count: '0',
        sent_count: '0',
        total_count: '0',
      }
    );
  }
}
