import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdir, statfs } from 'fs/promises';
import Redis from 'ioredis';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { AppConfig } from '../../config/app.config';
import { REDIS_CLIENT } from '../auth/sessions/redis.provider';
import { ReportOutboxMonitoringService } from '../reports/outbox/report-outbox-monitoring.service';

type ComponentStatus = 'ok' | 'degraded' | 'down' | 'disabled';
type OverallStatus = 'ok' | 'degraded' | 'down';

type MonitoringComponent = {
  details?: Record<string, unknown>;
  error?: string;
  status: ComponentStatus;
};

type MonitoringStatusResponse = {
  checkedAt: string;
  components: {
    database: MonitoringComponent;
    redis: MonitoringComponent;
    reportOutbox: MonitoringComponent;
    storage: MonitoringComponent;
  };
  config: {
    nodeEnv: string;
    reportingCorePublishEnabled: boolean;
    reportingCoreTransport: string;
    storageBackend: string;
    swaggerEnabled: boolean;
  };
  schemaVersion: '1.0';
  service: 'patrol-backend';
  status: OverallStatus;
};

@Injectable()
export class MonitoringService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly dataSource: DataSource,
    private readonly outboxMonitoringService: ReportOutboxMonitoringService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async getStatus(actor: AuthenticatedUser): Promise<MonitoringStatusResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'MONITORING_FORBIDDEN',
        'User cannot access monitoring status',
      );
    }

    const [database, redis, storage, reportOutbox] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkReportOutbox(actor),
    ]);
    const components = { database, redis, reportOutbox, storage };

    return {
      checkedAt: new Date().toISOString(),
      components,
      config: {
        nodeEnv: this.configService.get('nodeEnv', { infer: true }),
        reportingCorePublishEnabled: this.configService.get('reportingCore.publishEnabled', {
          infer: true,
        }),
        reportingCoreTransport: this.configService.get('reportingCore.transport', { infer: true }),
        storageBackend: this.configService.get('files.storageBackend', { infer: true }),
        swaggerEnabled: this.configService.get('swagger.enabled', { infer: true }),
      },
      schemaVersion: '1.0',
      service: 'patrol-backend',
      status: getOverallStatus(Object.values(components)),
    };
  }

  private async checkDatabase(): Promise<MonitoringComponent> {
    try {
      await this.dataSource.query('SELECT 1');

      return { status: 'ok' };
    } catch (error: unknown) {
      return { error: getErrorMessage(error), status: 'down' };
    }
  }

  private async checkRedis(): Promise<MonitoringComponent> {
    try {
      const response = await this.redis.ping();

      return {
        details: { ping: response },
        status: response === 'PONG' ? 'ok' : 'degraded',
      };
    } catch (error: unknown) {
      return { error: getErrorMessage(error), status: 'down' };
    }
  }

  private async checkStorage(): Promise<MonitoringComponent> {
    const backend = this.configService.get('files.storageBackend', { infer: true });

    if (backend !== 'local') {
      return {
        details: { backend },
        status: 'disabled',
      };
    }

    const root = resolve(this.configService.get('files.localRoot', { infer: true }));

    try {
      await mkdir(root, { recursive: true });
      await access(root);
      const stats = await statfs(root);
      const freeBytes = stats.bavail * stats.bsize;
      const totalBytes = stats.blocks * stats.bsize;

      return {
        details: {
          backend,
          freeBytes,
          path: root,
          totalBytes,
        },
        status: 'ok',
      };
    } catch (error: unknown) {
      return {
        details: { backend, path: root },
        error: getErrorMessage(error),
        status: 'down',
      };
    }
  }

  private async checkReportOutbox(actor: AuthenticatedUser): Promise<MonitoringComponent> {
    try {
      const status = await this.outboxMonitoringService.getStatus(actor);
      const failed = status.counters.failed;
      const oldestUnsentSeconds = status.lag.oldestUnsentSeconds ?? 0;

      return {
        details: {
          counters: status.counters,
          lag: status.lag,
          lastSentAt: status.lastSentAt,
        },
        status: failed > 0 || oldestUnsentSeconds > 3600 ? 'degraded' : 'ok',
      };
    } catch (error: unknown) {
      return { error: getErrorMessage(error), status: 'down' };
    }
  }
}

function getOverallStatus(components: MonitoringComponent[]): OverallStatus {
  if (components.some((component) => component.status === 'down')) {
    return 'down';
  }

  if (components.some((component) => component.status === 'degraded')) {
    return 'degraded';
  }

  return 'ok';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
