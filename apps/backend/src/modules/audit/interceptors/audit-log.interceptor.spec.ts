import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from '../../../../../../node_modules/rxjs';

import { AuditLogService } from '../audit-log.service';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { AuditLogInterceptor } from './audit-log.interceptor';

type AuditLogServiceMock = Pick<AuditLogService, 'recordSafely'>;

describe('AuditLogInterceptor', () => {
  let auditLogService: jest.Mocked<AuditLogServiceMock>;
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    auditLogService = {
      recordSafely: jest.fn(),
    };
    interceptor = new AuditLogInterceptor(auditLogService as unknown as AuditLogService);
  });

  it('records successful mutating requests with sanitized body', async () => {
    const responseId = '00000000-0000-4000-8000-000000000001';
    const context = createContext({
      body: {
        name: 'Shop 1',
        password: 'secret',
      },
      method: 'POST',
      originalUrl: '/api/v1/shops',
      path: '/shops',
      route: { path: '/shops' },
      user: {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    });
    const next: CallHandler = {
      handle: () => of({ id: responseId }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'POST /shops',
        entityId: responseId,
        entityType: 'shops',
        userId: 'admin-id',
        meta: expect.objectContaining({
          body: {
            name: 'Shop 1',
            password: '[redacted]',
          },
          status: 'success',
          userRole: 'admin',
        }),
      }),
    );
  });

  it('skips unauthenticated requests', async () => {
    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/login',
      path: '/auth/login',
      route: { path: '/auth/login' },
    });
    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(auditLogService.recordSafely).not.toHaveBeenCalled();
  });

  it('records failed mutating requests and rethrows the error', async () => {
    const error = new DomainValidationError('SHOP_FORBIDDEN', 'User cannot update this shop');
    const context = createContext({
      body: {
        accessToken: 'secret-token',
        name: 'Shop 1',
      },
      method: 'PATCH',
      originalUrl: '/api/v1/shops/00000000-0000-4000-8000-000000000001',
      params: { id: '00000000-0000-4000-8000-000000000001' },
      path: '/shops/00000000-0000-4000-8000-000000000001',
      route: { path: '/shops/:id' },
      user: {
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        username: 'inspector',
      },
    });
    const next: CallHandler = {
      handle: () => throwError(() => error),
    };

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);

    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATCH /shops/:id',
        entityId: '00000000-0000-4000-8000-000000000001',
        entityType: 'shops',
        userId: 'inspector-id',
        meta: expect.objectContaining({
          body: {
            accessToken: '[redacted]',
            name: 'Shop 1',
          },
          errorCode: 'SHOP_FORBIDDEN',
          errorMessage: 'User cannot update this shop',
          status: 'failure',
          statusCode: 400,
          userRole: 'inspector',
        }),
      }),
    );
  });
});

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        ip: '127.0.0.1',
        params: {},
        query: {},
        ...request,
      }),
    }),
  } as ExecutionContext;
}
