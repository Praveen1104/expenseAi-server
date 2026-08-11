import { STATUS_CODES, StatusCode } from '../constants/statusCodes.js';

export abstract class BaseError extends Error {
  public abstract readonly statusCode: StatusCode;
  public readonly isOperational: boolean;

  constructor(message: string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ApiError extends BaseError {
  public readonly statusCode: StatusCode;

  constructor(
    statusCode: StatusCode = STATUS_CODES.INTERNAL_SERVER_ERROR,
    message: string = 'An unexpected error occurred',
    isOperational = true
  ) {
    super(message, isOperational);
    this.statusCode = statusCode;
  }
}

export class ValidationError extends BaseError {
  public readonly statusCode = STATUS_CODES.BAD_REQUEST;
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation Error', errors: Record<string, string[]> = {}) {
    super(message, true);
    this.errors = errors;
  }
}

export class NotFoundError extends BaseError {
  public readonly statusCode = STATUS_CODES.NOT_FOUND;

  constructor(message = 'Resource not found') {
    super(message, true);
  }
}

export class UnauthorizedError extends BaseError {
  public readonly statusCode = STATUS_CODES.UNAUTHORIZED;

  constructor(message = 'Unauthorized') {
    super(message, true);
  }
}

