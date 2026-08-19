import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../../config/app.config';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ReportingCoreClientPort } from './reporting-core-client.port';

@Injectable()
export class HttpReportingCoreClientService implements ReportingCoreClientPort {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async publish(event: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const url = this.configService.get('reportingCore.url', { infer: true });

    if (url === undefined) {
      throw new DomainValidationError(
        'REPORTING_CORE_URL_REQUIRED',
        'Reporting core URL is required for HTTP transport',
      );
    }

    const apiKey = this.configService.get('reportingCore.apiKey', { infer: true });
    const response = await fetch(`${url.replace(/\/$/, '')}/reporting/events`, {
      body: JSON.stringify(event.payload),
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': event.eventId,
        ...(apiKey === undefined ? {} : { Authorization: `Bearer ${apiKey}` }),
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Reporting core responded with ${response.status}`);
    }
  }
}
