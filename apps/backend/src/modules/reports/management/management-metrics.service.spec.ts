import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ManagementMetricsRepository } from './management-metrics.repository';
import { ManagementMetricsService } from './management-metrics.service';

type ManagementMetricsRepositoryMock = Pick<ManagementMetricsRepository, 'getMetrics'>;

describe('ManagementMetricsService', () => {
  let repository: jest.Mocked<ManagementMetricsRepositoryMock>;
  let service: ManagementMetricsService;

  beforeEach(() => {
    repository = {
      getMetrics: jest.fn(),
    };
    service = new ManagementMetricsService(repository as unknown as ManagementMetricsRepository);
  });

  it('returns aggregated management metrics without personal details', async () => {
    repository.getMetrics.mockResolvedValue({
      attention_patrols: '3',
      attention_shop_count: '1',
      average_completion_seconds: '725.4',
      clean_patrols: '8',
      completed_patrols: '9',
      green_shop_count: '4',
      on_time_patrols: '7',
      planned_patrols: '10',
      submitted_reports: '6',
    });

    await expect(
      service.getMetrics(
        {
          from: '2026-08-01T00:00:00.000Z',
          regionId: 'region-id',
          to: '2026-08-18T23:59:59.999Z',
        },
        {
          fullName: 'Admin',
          id: 'admin-id',
          role: 'admin',
          username: 'admin',
        },
      ),
    ).resolves.toEqual({
      metrics: {
        attentionPatrols: 3,
        attentionRate: 0.3,
        attentionShopCount: 1,
        averageCompletionSeconds: 725,
        cleanPatrolRate: 0.8889,
        cleanPatrols: 8,
        completedPatrols: 9,
        completionRate: 0.9,
        greenShopCount: 4,
        onTimePatrols: 7,
        onTimeRate: 0.7778,
        plannedPatrols: 10,
        submittedReports: 6,
      },
      period: {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-18T23:59:59.999Z',
      },
      schemaVersion: '1.0',
      scope: {
        regionId: 'region-id',
        shopId: null,
      },
      sourceService: 'patrol',
    });
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.getMetrics(
        {},
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          username: 'inspector',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.getMetrics).not.toHaveBeenCalled();
  });
});
