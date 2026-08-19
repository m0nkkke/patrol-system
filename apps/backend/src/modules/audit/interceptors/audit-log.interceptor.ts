import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from '../../../../../../node_modules/rxjs';

import { AuthenticatedRequest } from '../../../common/auth/authenticated-request';
import { DomainError } from '../../../common/errors/domain.error';
import { DomainConflictError } from '../../../common/errors/domain-conflict.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { AuditLogService } from '../audit-log.service';

const AUDITED_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);
const SENSITIVE_KEYS = new Set([
  'accessToken',
  'authorization',
  'newPassword',
  'password',
  'passwordHash',
  'refreshToken',
  'token',
  'tokenHash',
]);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!shouldAudit(request)) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        void this.auditLogService.recordSafely({
          action: buildAction(request),
          deviceId: extractDeviceId(request),
          entityId: extractEntityId(request, responseBody),
          entityType: extractEntityType(request),
          ipAddress: request.ip,
          meta: {
            authorizationFullName: request.user?.authorizationFullName ?? null,
            authorizationId: request.user?.authorizationId ?? null,
            body: sanitizeBody(request),
            durationMs: Date.now() - startedAt,
            method: request.method,
            params: sanitizeObject(request.params),
            path: request.originalUrl?.split('?')[0] ?? request.path,
            query: sanitizeObject(request.query),
            status: 'success',
            userRole: request.user?.role ?? null,
          },
          userId: request.user?.id ?? null,
        });
      }),
      catchError((error: unknown) => {
        const normalizedError = normalizeError(error);

        void this.auditLogService.recordSafely({
          action: buildAction(request),
          deviceId: extractDeviceId(request),
          entityId: extractEntityId(request),
          entityType: extractEntityType(request),
          ipAddress: request.ip,
          meta: {
            authorizationFullName: request.user?.authorizationFullName ?? null,
            authorizationId: request.user?.authorizationId ?? null,
            body: sanitizeBody(request),
            durationMs: Date.now() - startedAt,
            errorCode: normalizedError.code,
            errorMessage: normalizedError.message,
            method: request.method,
            params: sanitizeObject(request.params),
            path: request.originalUrl?.split('?')[0] ?? request.path,
            query: sanitizeObject(request.query),
            status: 'failure',
            statusCode: normalizedError.statusCode,
            userRole: request.user?.role ?? null,
          },
          userId: request.user?.id ?? null,
        });

        return throwError(() => error);
      }),
    );
  }
}

function normalizeError(error: unknown): { code: string; message: string; statusCode: number } {
  if (error instanceof EntityNotFoundError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: 404,
    };
  }

  if (error instanceof DomainConflictError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: 409,
    };
  }

  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: 400,
    };
  }

  if (error instanceof HttpException) {
    return {
      code: error.name,
      message: normalizeHttpMessage(error.getResponse()),
      statusCode: error.getStatus(),
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    statusCode: 500,
  };
}

function shouldAudit(request: AuthenticatedRequest): boolean {
  return request.user !== undefined && AUDITED_METHODS.has(request.method);
}

function buildAction(request: AuthenticatedRequest): string {
  const routePath = typeof request.route?.path === 'string' ? request.route.path : request.path;
  return `${request.method} ${routePath}`.slice(0, 100);
}

function extractDeviceId(request: AuthenticatedRequest): string | null {
  const header = request.headers['x-device-id'];

  if (Array.isArray(header)) {
    return header[0] ?? null;
  }

  if (typeof header === 'string' && header.length > 0) {
    return header.slice(0, 200);
  }

  return null;
}

function extractEntityId(request: AuthenticatedRequest, responseBody?: unknown): string | null {
  const idParam = request.params?.id;

  if (typeof idParam === 'string' && isUuid(idParam)) {
    return idParam;
  }

  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'id' in responseBody &&
    typeof responseBody.id === 'string' &&
    isUuid(responseBody.id)
  ) {
    return responseBody.id;
  }

  return null;
}

function extractEntityType(request: AuthenticatedRequest): string | null {
  const path = request.originalUrl?.split('?')[0] ?? request.path;
  const segments = path.split('/').filter(Boolean);
  const withoutApiPrefix =
    segments[0] === 'api' && /^v\d+$/.test(segments[1] ?? '')
      ? segments.slice(2)
      : segments;

  return withoutApiPrefix[0]?.slice(0, 100) ?? null;
}

function sanitizeBody(request: AuthenticatedRequest): Record<string, unknown> | null {
  const body = request.body;

  if (body === undefined || body === null || typeof body !== 'object' || Buffer.isBuffer(body)) {
    return null;
  }

  if (isAnonymousAppealRequest(request)) {
    return { anonymousAppeal: true, shopId: (body as Record<string, unknown>).shopId ?? null };
  }

  if ('buffer' in body || 'originalname' in body || 'mimetype' in body) {
    return { file: true };
  }

  return sanitizeObject(body as Record<string, unknown>);
}

function isAnonymousAppealRequest(request: AuthenticatedRequest): boolean {
  const path = request.originalUrl?.split('?')[0] ?? request.path;
  return request.method === 'POST' && path.includes('/mobile/anonymous');
}

function sanitizeObject(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null || typeof value !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[redacted]';
      continue;
    }

    if (rawValue === undefined) {
      continue;
    }

    if (rawValue === null || typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      result[key] = rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      result[key] = rawValue.length <= 20 ? rawValue : `[array:${rawValue.length}]`;
      continue;
    }

    result[key] = '[object]';
  }

  return result;
}

function normalizeHttpMessage(response: string | object): string {
  if (typeof response === 'string') {
    return response;
  }

  if ('message' in response) {
    const message = response.message;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }

  return 'Request failed';
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
