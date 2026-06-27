import { NotificationsService } from '../notifications/notifications.service';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolOverdueService } from './patrol-overdue.service';
import { PatrolsRepository } from './patrols.repository';

type PatrolsRepositoryMock = Pick<
  PatrolsRepository,
  'findOverdueCandidates' | 'markOverdueByIds'
>;
type NotificationsServiceMock = Pick<NotificationsService, 'notifyPatrolOverdue'>;

describe('PatrolOverdueService', () => {
  it('marks patrols with expired deadlines as overdue', async () => {
    const repository: jest.Mocked<PatrolsRepositoryMock> = {
      findOverdueCandidates: jest.fn().mockResolvedValue([
        createPatrol({ id: 'patrol-1' }),
        createPatrol({ id: 'patrol-2' }),
      ]),
      markOverdueByIds: jest.fn().mockResolvedValue(2),
    };
    const notificationsService: jest.Mocked<NotificationsServiceMock> = {
      notifyPatrolOverdue: jest.fn(),
    };
    const service = new PatrolOverdueService(
      notificationsService as unknown as NotificationsService,
      repository as unknown as PatrolsRepository,
    );

    await service.markOverduePatrols();

    expect(repository.findOverdueCandidates).toHaveBeenCalledWith(expect.any(Date));
    expect(repository.markOverdueByIds).toHaveBeenCalledWith(['patrol-1', 'patrol-2']);
    expect(notificationsService.notifyPatrolOverdue).toHaveBeenCalledTimes(2);
  });
});

function createPatrol(overrides: Partial<PatrolEntity> = {}): PatrolEntity {
  return {
    employee: { fullName: 'Иван Петров' },
    employeeId: 'employee-id',
    id: 'patrol-id',
    shop: { name: 'Магазин 1' },
    shopId: 'shop-id',
    status: 'in_progress',
    ...overrides,
  } as PatrolEntity;
}
