import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ManagementScorecardsRepository } from './management-scorecards.repository';
import { ManagementScorecardsService } from './management-scorecards.service';

type ManagementScorecardsRepositoryMock = Pick<ManagementScorecardsRepository, 'findScorecards'>;

describe('ManagementScorecardsService', () => {
  let repository: jest.Mocked<ManagementScorecardsRepositoryMock>;
  let service: ManagementScorecardsService;

  beforeEach(() => {
    repository = {
      findScorecards: jest.fn(),
    };
    service = new ManagementScorecardsService(
      repository as unknown as ManagementScorecardsRepository,
    );
  });

  it('returns shop scorecards without personal details', async () => {
    repository.findScorecards.mockResolvedValue({
      items: [
        {
          attention_patrols: '0',
          average_completion_seconds: '420.2',
          clean_patrols: '10',
          completed_patrols: '10',
          on_time_patrols: '9',
          planned_patrols: '10',
          region_id: 'region-id',
          shop_id: 'shop-id',
          shop_name: 'Shop 1',
          submitted_reports: '4',
          total_count: '1',
        },
      ],
      total: 1,
    });

    await expect(
      service.getShopScorecards(
        {
          from: '2026-08-01T00:00:00.000Z',
          limit: 20,
          page: 2,
          sort: 'completionRate:desc',
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
      items: [
        {
          metrics: {
            attentionPatrols: 0,
            attentionRate: 0,
            averageCompletionSeconds: 420,
            cleanPatrolRate: 1,
            cleanPatrols: 10,
            completedPatrols: 10,
            completionRate: 1,
            onTimePatrols: 9,
            onTimeRate: 0.9,
            plannedPatrols: 10,
            submittedReports: 4,
          },
          regionId: 'region-id',
          shopId: 'shop-id',
          shopName: 'Shop 1',
          status: 'green',
        },
      ],
      meta: {
        limit: 20,
        page: 2,
        total: 1,
      },
      period: {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-18T23:59:59.999Z',
      },
      schemaVersion: '1.0',
      scope: {
        regionId: null,
        shopId: null,
      },
      sourceService: 'patrol',
    });
    expect(repository.findScorecards).toHaveBeenCalledWith(expect.any(Object), {
      limit: 20,
      offset: 20,
      sort: 'completionRate:desc',
    });
  });

  it('marks a shop as attention when planned patrols are not fully completed', async () => {
    repository.findScorecards.mockResolvedValue({
      items: [
        {
          attention_patrols: '0',
          average_completion_seconds: null,
          clean_patrols: '4',
          completed_patrols: '4',
          on_time_patrols: '4',
          planned_patrols: '5',
          region_id: null,
          shop_id: 'shop-id',
          shop_name: 'Shop 1',
          submitted_reports: '0',
          total_count: '1',
        },
      ],
      total: 1,
    });

    const result = await service.getShopScorecards(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.items[0]?.status).toBe('attention');
    expect(result.items[0]?.metrics.completionRate).toBe(0.8);
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.getShopScorecards(
        {},
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          username: 'inspector',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.findScorecards).not.toHaveBeenCalled();
  });
});
