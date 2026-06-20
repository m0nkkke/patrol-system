import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

import { DomainError } from '../errors/domain.error';
import { EntityNotFoundError } from '../errors/not-found.error';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';

type ErrorResponse = {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorResponse = this.toErrorResponse(exception);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof EntityNotFoundError) {
      return createErrorResponse(HttpStatus.NOT_FOUND, exception.code, exception.message);
    }

    if (exception instanceof InvalidCredentialsError || exception instanceof UnauthorizedException) {
      return createErrorResponse(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Unauthorized');
    }

    if (exception instanceof DomainError) {
      return createErrorResponse(HttpStatus.BAD_REQUEST, exception.code, exception.message);
    }

    if (exception instanceof HttpException) {
      return createErrorResponse(
        exception.getStatus(),
        exception.name,
        normalizeHttpMessage(exception.getResponse()),
      );
    }

    this.logger.error(getUnknownErrorMessage(exception), getUnknownErrorStack(exception));

    return createErrorResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR',
      'Internal server error',
    );
  }
}

function getUnknownErrorMessage(exception: unknown): string {
  return exception instanceof Error ? exception.message : 'Unknown exception';
}

function getUnknownErrorStack(exception: unknown): string | undefined {
  return exception instanceof Error ? exception.stack : undefined;
}

function createErrorResponse(statusCode: number, code: string, message: string): ErrorResponse {
  return {
    code,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
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
