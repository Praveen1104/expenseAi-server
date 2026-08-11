import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/apiError.js';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};
