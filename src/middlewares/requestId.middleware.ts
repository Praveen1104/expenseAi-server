import { Request, Response, NextFunction } from 'express';
import rTracer from 'cls-rtracer';

export const requestIdMiddleware = rTracer.expressMiddleware({
  echoHeader: true,
  headerName: 'X-Request-ID',
});

export const attachRequestMeta = (req: Request, _res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  req.id = (rTracer.id() as string) || `req-${Math.random().toString(36).substring(2, 9)}`;
  next();
};
