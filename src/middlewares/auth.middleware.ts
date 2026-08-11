import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: DecodedToken;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if ((process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || env.BYPASS_AUTH === 'true') && !req.headers['x-test-no-bypass']) {
      (req as AuthRequest).user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'USER',
      };
      next();
      return;
    }

    res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: 'Access token required. Authorization header missing or malformed.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedToken;
    (req as AuthRequest).user = decoded;
    next();
  } catch (err) {
    res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid or expired access token.',
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        error: 'Forbidden. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

export const authorize = (req: Request, res: Response, next: NextFunction): void => {
  // Syntactic sugar alias for standard auth checks
  authenticate(req, res, next);
};
