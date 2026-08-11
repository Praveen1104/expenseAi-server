import { Request, Response, NextFunction } from 'express';
import { BaseError, ValidationError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.config.js';

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  const authReq = req as any;
  logger.error(`Error on ${req.method} ${req.url} (Request ID: ${authReq.id || 'no-request-id'}): ${err.message}`, {
    stack: err.stack,
    requestId: authReq.id || 'no-request-id',
    endpoint: `${req.method} ${req.path}`,
    userId: authReq.user?.userId || undefined,
    errorType: err.name || err.constructor.name,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof ValidationError) {
    return ApiResponse.error({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof BaseError) {
    return ApiResponse.error({
      res,
      statusCode: err.statusCode,
      message: err.message,
    });
  }

  const isDev = env.NODE_ENV === 'development';
  return ApiResponse.error({
    res,
    statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
    message: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { errors: { stack: err.stack } }),
  });
};
