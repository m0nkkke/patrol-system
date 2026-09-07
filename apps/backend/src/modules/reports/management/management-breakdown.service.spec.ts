import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ManagementBreakdownRepository } from './management-breakdown.repository';
import { ManagementBreakdownService } from './management-breakdown.service';

type ManagementBreakdownRepositoryMock = Pick<ManagementBreakdownRepository, 'findBreakdown'>;

describe('ManagementBreakdownService', () => {
  let repository: jest.Mocked<ManagementBreakdownRepositoryMock>;
  let service: ManagementBreakdownService;

  beforeEach(() => {
    repository = {
      findBreakdown: jest.fn(),
    };
    service = new ManagementBreakdownService(
      repository as unknown as ManagementBreakdownRepository,
    );
  });

  it('returns route category breakdown with stable empty groups', async () => {
    repository.findBreakdown.mockResolvedValue([
      {
        attention_patrols: '1',
        average_completion_seconds: '360.2',
        clean_patrols: '8',
        completed_patrols: '9',
        group_key: 'internal',
        on_time_patrols: '7',
        registered_patrols: '10',
        submitted_reports: '3',
      },
    ]);

    await expect(
      service.getBreakdown(
        {
          from: '2026-08-01T00:00:00.000Z',
          groupBy: 'routeCategory',
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
      groupBy: 'routeCategory',
      items: [
        {
          groupKey: 'internal',
          metrics: {
            attentionPatrols: 1,
            attentionRate: 0.1,
            averageCompletionSeconds: 360,
            cleanPatrolRate: 0.8889,
            cleanPatrols: 8,
            completedPatrols: 9,
            completionRate: 0.9,
            onTimePatrols: 7,
            onTimeRate: 0.7778,
            registeredPatrols: 10,
            submittedReports: 3,
          },
        },
        {
          groupKey: 'external',
          metrics: {
            attentionPatrols: 0,
            attentionRate: 0,
            averageCompletionSeconds: null,
            cleanPatrolRate: 0,
            cleanPatrols: 0,
            completedPatrols: 0,
            completionRate: 0,
            onTimePatrols: 0,
            onTimeRate: 0,
            registeredPatrols: 0,
            submittedReports: 0,
          },
        },
      ],
      period: {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-18T23:59:59.999Z',
      },
      schemaVersion: '2.0',
      scope: {
        regionId: 'region-id',
        shopId: null,
      },
      sourceService: 'patrol',
    });
    expect(repository.findBreakdown).toHaveBeenCalledWith(expect.any(Object), 'routeCategory');
  });

  it('returns period breakdown when requested', async () => {
    repository.findBreakdown.mockResolvedValue([
      {
        attention_patrols: '0',
        average_completion_seconds: null,
        clean_patrols: '2',
        completed_patrols: '2',
        group_key: 'noon',
        on_time_patrols: '2',
        registered_patrols: '2',
        submitted_reports: '1',
      },
    ]);

    const result = await service.getBreakdown(
      { groupBy: 'period' },
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.groupBy).toBe('period');
    expect(result.items.map((item) => item.groupKey)).toEqual(['morning', 'noon', 'evening']);
    expect(result.items[1]?.metrics.completionRate).toBe(1);
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.getBreakdown(
        {},
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          username: 'inspector',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.findBreakdown).not.toHaveBeenCalled();
  });
});
