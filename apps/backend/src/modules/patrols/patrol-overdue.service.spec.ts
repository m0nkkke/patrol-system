import { PatrolOverdueService } from './patrol-overdue.service';
import { PatrolsRepository } from './patrols.repository';

type PatrolsRepositoryMock = Pick<PatrolsRepository, 'markOverdue'>;

describe('PatrolOverdueService', () => {
  it('marks patrols with expired deadlines as overdue', async () => {
    const repository: jest.Mocked<PatrolsRepositoryMock> = {
      markOverdue: jest.fn().mockResolvedValue(2),
    };
    const service = new PatrolOverdueService(repository as unknown as PatrolsRepository);

    await service.markOverduePatrols();

    expect(repository.markOverdue).toHaveBeenCalledWith(expect.any(Date));
  });
});
