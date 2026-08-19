import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../../config/app.config';
import { ReportOutboxEventEntity } from '../entities/report-outbox-event.entity';
import { ReportOutboxRepository } from './report-outbox.repository';
import {
  REPORTING_CORE_CLIENT,
  ReportingCoreClientPort,
} from './reporting-core-client.port';

const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

@Injectable()
export class ReportOutboxPublisherService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(ReportOutboxPublisherService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly outboxRepository: ReportOutboxRepository,
    @Inject(REPORTING_CORE_CLIENT)
    private readonly reportingCoreClient: ReportingCoreClientPort,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      return;
    }

    this.timer = setInterval(
      () => {
        void this.publishReadyEvents();
      },
      this.configService.get('reportingCore.publishIntervalMs', { infer: true }),
    );
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
    }
  }

  async publishReadyEvents(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const now = new Date();
    const events = await this.outboxRepository.findReadyToPublish(
      now,
      this.configService.get('reportingCore.batchSize', { infer: true }),
    );

    for (const event of events) {
      await this.publishEvent(event);
    }
  }

  private async publishEvent(event: ReportOutboxEventEntity): Promise<void> {
    try {
      await this.reportingCoreClient.publish({
        eventId: event.eventId,
        eventType: event.eventType,
        payload: event.payload,
      });
      await this.outboxRepository.markSent(event.id, new Date());
    } catch (error: unknown) {
      const nextAttemptCount = event.attemptCount + 1;
      const nextAttemptAt = new Date(Date.now() + calculateBackoffMs(nextAttemptCount));
      await this.outboxRepository.markFailed(event.id, nextAttemptCount, nextAttemptAt);

      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to publish report outbox event ${event.eventId}`, message);
    }
  }

  private isEnabled(): boolean {
    return this.configService.get('reportingCore.publishEnabled', { infer: true });
  }
}

function calculateBackoffMs(attemptCount: number): number {
  return Math.min(2 ** Math.max(attemptCount - 1, 0) * 60_000, MAX_RETRY_DELAY_MS);
}
