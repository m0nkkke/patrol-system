import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ReportOutboxMonitoringService } from './report-outbox-monitoring.service';
import { ReportOutboxRepository } from './report-outbox.repository';

type ConfigServiceMock = {
  get: jest.Mock;
};
type ReportOutboxRepositoryMock = Pick<ReportOutboxRepository, 'getStats'>;

describe('ReportOutboxMonitoringService', () => {
  let configService: jest.Mocked<ConfigServiceMock>;
  let repository: jest.Mocked<ReportOutboxRepositoryMock>;
  let service: ReportOutboxMonitoringService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-18T10:00:00.000Z'));
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'reportingCore.batchSize': 25,
          'reportingCore.publishEnabled': true,
          'reportingCore.publishIntervalMs': 30000,
          'reportingCore.transport': 'http',
        };

        return values[key];
      }),
    };
    repository = {
      getStats: jest.fn(),
    };
    service = new ReportOutboxMonitoringService(
      configService as unknown as ConstructorParameters<
        typeof ReportOutboxMonitoringService
      >[0],
      repository as unknown as ReportOutboxRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns outbox counters and lag for admin', async () => {
    repository.getStats.mockResolvedValue({
      failed_count: '2',
      last_sent_at: new Date('2026-08-18T09:58:00.000Z'),
      oldest_unsent_created_at: new Date('2026-08-18T09:55:00.000Z'),
      pending_count: '3',
      ready_count: '4',
      sent_count: '10',
      total_count: '15',
    });

    await expect(
      service.getStatus({
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      }),
    ).resolves.toEqual({
      checkedAt: '2026-08-18T10:00:00.000Z',
      config: {
        batchSize: 25,
        publishEnabled: true,
        publishIntervalMs: 30000,
        transport: 'http',
      },
      counters: {
        failed: 2,
        pending: 3,
        ready: 4,
        sent: 10,
        total: 15,
      },
      lag: {
        oldestUnsentCreatedAt: '2026-08-18T09:55:00.000Z',
        oldestUnsentSeconds: 300,
      },
      lastSentAt: '2026-08-18T09:58:00.000Z',
      schemaVersion: '1.0',
      sourceService: 'patrol',
    });
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.getStatus({
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        username: 'inspector',
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.getStats).not.toHaveBeenCalled();
  });
});
