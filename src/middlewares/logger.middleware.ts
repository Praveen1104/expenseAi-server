import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { AuthRequest } from './auth.middleware.js';

export const httpLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const authReq = req as AuthRequest;

    const logDetails = {
      requestId: authReq.id || req.headers['x-request-id'] || 'no-request-id',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: authReq.user?.userId || undefined,
    };

    const message = `${logDetails.method} ${logDetails.path} status:${logDetails.statusCode} duration:${logDetails.durationMs}ms`;

    if (res.statusCode >= 500) {
      logger.error(message, logDetails);
    } else if (res.statusCode >= 400) {
      logger.warn(message, logDetails);
    } else {
      logger.info(message, logDetails);
    }
  });

  next();
};
