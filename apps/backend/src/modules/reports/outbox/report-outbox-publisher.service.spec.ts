import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { AppConfig } from '../../../config/app.config';
import { ReportOutboxEventEntity } from '../entities/report-outbox-event.entity';
import { ReportOutboxPublisherService } from './report-outbox-publisher.service';
import { ReportOutboxRepository } from './report-outbox.repository';
import { ReportingCoreClientPort } from './reporting-core-client.port';

type ReportOutboxRepositoryMock = Pick<
  ReportOutboxRepository,
  'findReadyToPublish' | 'markFailed' | 'markSent'
>;
type ConfigServiceMock = {
  get: jest.Mock;
};

describe('ReportOutboxPublisherService', () => {
  let client: jest.Mocked<ReportingCoreClientPort>;
  let configService: ConfigServiceMock;
  let repository: jest.Mocked<ReportOutboxRepositoryMock>;
  let service: ReportOutboxPublisherService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    client = {
      publish: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'reportingCore.batchSize': 50,
          'reportingCore.publishEnabled': true,
          'reportingCore.publishIntervalMs': 30000,
        };

        return values[key];
      }),
    };
    repository = {
      findReadyToPublish: jest.fn(),
      markFailed: jest.fn(),
      markSent: jest.fn(),
    };
    service = new ReportOutboxPublisherService(
      configService as unknown as ConfigService<AppConfig, true>,
      repository as unknown as ReportOutboxRepository,
      client,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when publishing is disabled', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'reportingCore.publishEnabled' ? false : 50,
    );

    await service.publishReadyEvents();

    expect(repository.findReadyToPublish).not.toHaveBeenCalled();
    expect(client.publish).not.toHaveBeenCalled();
  });

  it('publishes ready events and marks them sent', async () => {
    const event = createEvent();
    repository.findReadyToPublish.mockResolvedValue([event]);

    await service.publishReadyEvents();

    expect(client.publish).toHaveBeenCalledWith({
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event.payload,
    });
    expect(repository.markSent).toHaveBeenCalledWith(event.id, expect.any(Date));
  });

  it('marks failed event with retry time after publish error', async () => {
    const event = createEvent({ attemptCount: 1 });
    repository.findReadyToPublish.mockResolvedValue([event]);
    client.publish.mockRejectedValue(new Error('network down'));

    await service.publishReadyEvents();

    expect(repository.markFailed).toHaveBeenCalledWith(event.id, 2, expect.any(Date));
  });
});

function createEvent(overrides: Partial<ReportOutboxEventEntity> = {}): ReportOutboxEventEntity {
  return {
    attemptCount: 0,
    createdAt: new Date(),
    eventId: '00000000-0000-4000-8000-000000000001',
    eventType: 'report.submitted',
    id: 'outbox-id',
    payload: { eventId: '00000000-0000-4000-8000-000000000001' },
    schemaVersion: '1.0',
    sourceService: 'patrol',
    status: 'pending',
    updatedAt: new Date(),
    ...overrides,
  } as ReportOutboxEventEntity;
}
