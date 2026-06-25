import axios from 'axios';

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

type DomainErrorBody = {
  code?: unknown;
  message?: unknown;
  statusCode?: unknown;
};

function isDomainErrorBody(value: unknown): value is DomainErrorBody {
  return typeof value === 'object' && value !== null;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body: unknown = error.response?.data;

    if (isDomainErrorBody(body)) {
      const code = typeof body.code === 'string' ? body.code : 'UNKNOWN_ERROR';
      const message = typeof body.message === 'string' ? body.message : error.message;
      const statusCode = typeof body.statusCode === 'number' ? body.statusCode : status;
      return new ApiError(code, message, statusCode);
    }

    if (!error.response) {
      return new ApiError('NETWORK_ERROR', 'Network request failed', 0);
    }

    return new ApiError('UNKNOWN_ERROR', error.message, status);
  }

  return new ApiError('UNKNOWN_ERROR', 'Unexpected error', 0);
}
