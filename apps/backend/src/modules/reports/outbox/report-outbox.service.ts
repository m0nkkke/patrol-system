import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { ReportOutboxRepository } from './report-outbox.repository';

export type ReportEventType =
  | 'report.draft_created'
  | 'report.file_attached'
  | 'report.submitted'
  | 'report.cancelled';

@Injectable()
export class ReportOutboxService {
  constructor(private readonly outboxRepository: ReportOutboxRepository) {}

  async emitReportEvent(
    eventType: ReportEventType,
    report: PatrolReportEntity,
    actor: AuthenticatedUser,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const eventId = randomUUID();
    const envelope = {
      actor: {
        fullName: actor.fullName,
        id: actor.id,
        role: actor.role,
      },
      eventId,
      eventType,
      occurredAt: new Date().toISOString(),
      payload: {
        employeeId: report.employeeId,
        fields: report.fields,
        patrolId: report.patrolId ?? null,
        period: report.period ?? null,
        reportId: report.id,
        reportType: report.reportType,
        routeId: report.routeId ?? null,
        scheduleId: report.scheduleId ?? null,
        shopId: report.shopId,
        status: report.status,
        ...payload,
      },
      schemaVersion: report.schemaVersion,
      sourceService: report.sourceService,
      subject: {
        id: report.id,
        type: 'patrol_report',
      },
      tenant: {
        organizationId: null,
        regionId: report.shop?.regionId ?? null,
        shopId: report.shopId,
      },
    };

    await this.outboxRepository.create({
      eventId,
      eventType,
      payload: envelope,
      schemaVersion: report.schemaVersion,
      sourceService: report.sourceService,
    });
  }
}
