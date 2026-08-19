import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { AppConfig } from '../../config/app.config';
import { ReportOutboxMonitoringService } from '../reports/outbox/report-outbox-monitoring.service';
import { MonitoringService } from './monitoring.service';

type ConfigServiceMock = Pick<ConfigService<AppConfig, true>, 'get'>;
type DataSourceMock = Pick<DataSource, 'query'>;
type RedisMock = Pick<Redis, 'ping'>;
type ReportOutboxMonitoringServiceMock = Pick<ReportOutboxMonitoringService, 'getStatus'>;

describe('MonitoringService', () => {
  let configService: jest.Mocked<ConfigServiceMock>;
  let dataSource: jest.Mocked<DataSourceMock>;
  let outboxMonitoringService: jest.Mocked<ReportOutboxMonitoringServiceMock>;
  let redis: jest.Mocked<RedisMock>;
  let service: MonitoringService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'files.localRoot': '.',
          'files.storageBackend': 'local',
          'nodeEnv': 'production',
          'reportingCore.publishEnabled': false,
          'reportingCore.transport': 'disabled',
          'swagger.enabled': false,
        };

        return values[key];
      }),
    } as unknown as jest.Mocked<ConfigServiceMock>;
    dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    outboxMonitoringService = {
      getStatus: jest.fn().mockResolvedValue(createOutboxStatus()),
    };
    redis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    } as unknown as jest.Mocked<RedisMock>;
    service = new MonitoringService(
      configService as unknown as ConfigService<AppConfig, true>,
      dataSource as unknown as DataSource,
      outboxMonitoringService as unknown as ReportOutboxMonitoringService,
      redis as unknown as Redis,
    );
  });

  it('returns ok status when all monitored components are healthy', async () => {
    const result = await service.getStatus(createActor());

    expect(result).toMatchObject({
      components: {
        database: { status: 'ok' },
        redis: { details: { ping: 'PONG' }, status: 'ok' },
        reportOutbox: { status: 'ok' },
        storage: { status: 'ok' },
      },
      config: {
        nodeEnv: 'production',
        reportingCorePublishEnabled: false,
        reportingCoreTransport: 'disabled',
        storageBackend: 'local',
        swaggerEnabled: false,
      },
      schemaVersion: '1.0',
      service: 'patrol-backend',
      status: 'ok',
    });
  });

  it('returns degraded when outbox has failed events', async () => {
    outboxMonitoringService.getStatus.mockResolvedValue(
      createOutboxStatus({
        counters: {
          failed: 1,
          pending: 0,
          ready: 1,
          sent: 5,
          total: 6,
        },
      }),
    );

    const result = await service.getStatus(createActor());

    expect(result.status).toBe('degraded');
    expect(result.components.reportOutbox.status).toBe('degraded');
  });

  it('rejects non-admin access', async () => {
    await expect(service.getStatus(createActor({ role: 'inspector' }))).rejects.toBeInstanceOf(
      DomainValidationError,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

function createActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Admin',
    id: 'admin-id',
    role: 'admin',
    username: 'admin',
    ...overrides,
  };
}

function createOutboxStatus(
  overrides: Partial<Awaited<ReturnType<ReportOutboxMonitoringService['getStatus']>>> = {},
): Awaited<ReturnType<ReportOutboxMonitoringService['getStatus']>> {
  return {
    checkedAt: '2026-08-18T10:00:00.000Z',
    config: {
      batchSize: 50,
      publishEnabled: false,
      publishIntervalMs: 30000,
      transport: 'disabled',
    },
    counters: {
      failed: 0,
      pending: 0,
      ready: 0,
      sent: 0,
      total: 0,
    },
    lag: {
      oldestUnsentCreatedAt: null,
      oldestUnsentSeconds: null,
    },
    lastSentAt: null,
    schemaVersion: '1.0',
    sourceService: 'patrol',
    ...overrides,
  };
}
