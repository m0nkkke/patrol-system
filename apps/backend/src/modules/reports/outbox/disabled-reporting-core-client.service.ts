import { Injectable } from '@nestjs/common';

import { ReportingCoreClientPort } from './reporting-core-client.port';

@Injectable()
export class DisabledReportingCoreClientService implements ReportingCoreClientPort {
  publish(): Promise<void> {
    return Promise.resolve();
  }
}
