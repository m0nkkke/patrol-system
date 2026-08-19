import { AuditLogExportService } from './audit-log-export.service';
import { AuditLogService } from '../audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

type AuditLogServiceMock = Pick<AuditLogService, 'findForExport'>;

describe('AuditLogExportService', () => {
  let auditLogService: jest.Mocked<AuditLogServiceMock>;
  let service: AuditLogExportService;

  beforeEach(() => {
    auditLogService = {
      findForExport: jest.fn(),
    };
    service = new AuditLogExportService(auditLogService as unknown as AuditLogService);
  });

  it('exports audit log as CSV', async () => {
    auditLogService.findForExport.mockResolvedValue([
      {
        action: 'POST /shops',
        createdAt: new Date('2026-08-18T10:00:00.000Z'),
        deviceId: 'device-id',
        entityId: '00000000-0000-4000-8000-000000000001',
        entityType: 'shops',
        id: '1',
        ipAddress: '127.0.0.1',
        meta: { body: { name: 'Shop 1' } },
        user: {
          fullName: 'Admin',
          role: 'admin',
          username: 'admin',
        },
        userId: 'admin-id',
      } as unknown as AuditLogEntity,
    ]);

    const result = await service.exportCsv(
      { limit: 20, page: 1 },
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.filename).toBe('audit-log.csv');
    expect(result.buffer.toString('utf8')).toContain('POST /shops');
    expect(result.buffer.toString('utf8')).toContain('Admin');
  });
});
