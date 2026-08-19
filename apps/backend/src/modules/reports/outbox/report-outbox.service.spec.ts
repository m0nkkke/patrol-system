import { ReportOutboxRepository } from './report-outbox.repository';
import { ReportOutboxService } from './report-outbox.service';
import { PatrolReportEntity } from '../entities/patrol-report.entity';

type ReportOutboxRepositoryMock = Pick<ReportOutboxRepository, 'create'>;

describe('ReportOutboxService', () => {
  let repository: jest.Mocked<ReportOutboxRepositoryMock>;
  let service: ReportOutboxService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
    };
    service = new ReportOutboxService(repository as unknown as ReportOutboxRepository);
  });

  it('stores report event envelope for future publishing', async () => {
    await service.emitReportEvent(
      'report.submitted',
      createReport(),
      {
        fullName: 'Security Guard',
        id: 'user-id',
        role: 'security_guard',
        shopId: 'shop-id',
        username: 'guard',
      },
      { submittedAt: '2026-08-18T05:20:00.000Z' },
    );

    expect(repository.create).toHaveBeenCalledWith({
      eventId: expect.any(String),
      eventType: 'report.submitted',
      payload: expect.objectContaining({
        actor: {
          fullName: 'Security Guard',
          id: 'user-id',
          role: 'security_guard',
        },
        eventId: expect.any(String),
        eventType: 'report.submitted',
        payload: expect.objectContaining({
          reportId: 'report-id',
          reportType: 'morning',
          shopId: 'shop-id',
          status: 'submitted',
          submittedAt: '2026-08-18T05:20:00.000Z',
        }),
        schemaVersion: '1.0',
        sourceService: 'patrol',
        subject: {
          id: 'report-id',
          type: 'patrol_report',
        },
        tenant: {
          organizationId: null,
          regionId: 'region-id',
          shopId: 'shop-id',
        },
      }),
      schemaVersion: '1.0',
      sourceService: 'patrol',
    });
  });
});

function createReport(overrides: Partial<PatrolReportEntity> = {}): PatrolReportEntity {
  return {
    createdAt: new Date(),
    employeeId: 'user-id',
    fields: { ok: true },
    id: 'report-id',
    reportType: 'morning',
    schemaVersion: '1.0',
    shop: { id: 'shop-id', regionId: 'region-id' },
    shopId: 'shop-id',
    sourceService: 'patrol',
    status: 'submitted',
    updatedAt: new Date(),
    ...overrides,
  } as PatrolReportEntity;
}
