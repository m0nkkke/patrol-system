import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ManagementTrendsRepository } from './management-trends.repository';
import { ManagementTrendsService } from './management-trends.service';

type ManagementTrendsRepositoryMock = Pick<ManagementTrendsRepository, 'findTrends'>;

describe('ManagementTrendsService', () => {
  let repository: jest.Mocked<ManagementTrendsRepositoryMock>;
  let service: ManagementTrendsService;

  beforeEach(() => {
    repository = {
      findTrends: jest.fn(),
    };
    service = new ManagementTrendsService(repository as unknown as ManagementTrendsRepository);
  });

  it('returns trend buckets without personal details', async () => {
    repository.findTrends.mockResolvedValue([
      {
        attention_patrols: '1',
        average_completion_seconds: '600.7',
        bucket_start: new Date('2026-08-01T00:00:00.000Z'),
        clean_patrols: '8',
        completed_patrols: '9',
        on_time_patrols: '7',
        planned_patrols: '10',
        submitted_reports: '4',
      },
    ]);

    await expect(
      service.getTrends(
        {
          bucket: 'week',
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
      bucket: 'week',
      items: [
        {
          bucketStart: '2026-08-01T00:00:00.000Z',
          metrics: {
            attentionPatrols: 1,
            attentionRate: 0.1,
            averageCompletionSeconds: 601,
            cleanPatrolRate: 0.8889,
            cleanPatrols: 8,
            completedPatrols: 9,
            completionRate: 0.9,
            onTimePatrols: 7,
            onTimeRate: 0.7778,
            plannedPatrols: 10,
            submittedReports: 4,
          },
        },
      ],
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
    expect(repository.findTrends).toHaveBeenCalledWith(expect.any(Object), 'week');
  });

  it('uses day as default bucket', async () => {
    repository.findTrends.mockResolvedValue([]);

    await service.getTrends(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(repository.findTrends).toHaveBeenCalledWith(expect.any(Object), 'day');
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.getTrends(
        {},
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          username: 'inspector',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.findTrends).not.toHaveBeenCalled();
  });
});
