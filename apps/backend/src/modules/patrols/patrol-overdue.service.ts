import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { PatrolsRepository } from './patrols.repository';

const OVERDUE_CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class PatrolOverdueService {
  private readonly logger = new Logger(PatrolOverdueService.name);

  constructor(private readonly patrolsRepository: PatrolsRepository) {}

  /** Marks unfinished patrols as overdue after their server-calculated deadline. */
  @Interval('mark-overdue-patrols', OVERDUE_CHECK_INTERVAL_MS)
  async markOverduePatrols(): Promise<void> {
    try {
      const affected = await this.patrolsRepository.markOverdue(new Date());

      if (affected > 0) {
        this.logger.warn(`Marked ${affected} patrol(s) as overdue`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error('Failed to mark overdue patrols', message);
    }
  }
}
