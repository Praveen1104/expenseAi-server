import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.config.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

export const getRootInfo = (_req: Request, res: Response): Response => {
  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'SmartSpend AI API Foundation',
    data: {
      name: 'SmartSpend AI API',
      version: '1.0.0',
      description: 'AI-Powered Receipt Scanner & Expense Analytics Dashboard API Engine',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
};
