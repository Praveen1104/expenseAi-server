import rateLimit from 'express-rate-limit';
import { env } from '../config/env.config.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
    timestamp: new Date().toISOString(),
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit: 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
    timestamp: new Date().toISOString(),
  },
});

