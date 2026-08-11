import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics/analytics.service.js';
import { TimeRangeFilter } from '../services/analytics/aggregation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { UnauthorizedError } from '../utils/apiError.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getSummary = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const range = (req.query.range as TimeRangeFilter) || 'month';
  const summary = await analyticsService.getSummary(range, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Summary analytics retrieved successfully',
    data: summary,
  });
};

export const getCategories = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const range = (req.query.range as TimeRangeFilter) || 'month';
  const categories = await analyticsService.getCategories(range, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Category breakdown analytics retrieved successfully',
    data: categories,
  });
};

export const getMerchants = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const range = (req.query.range as TimeRangeFilter) || 'month';
  const limit = parseInt(req.query.limit as string, 10) || 5;
  const merchants = await analyticsService.getMerchants(range, limit, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Merchant leaderboard analytics retrieved successfully',
    data: merchants,
  });
};

export const getTrends = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const range = (req.query.range as TimeRangeFilter) || 'month';
  const trends = await analyticsService.getTrends(range, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Spending trends analytics retrieved successfully',
    data: trends,
  });
};

export const generateInsights = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const range = (req.body.range as TimeRangeFilter) || 'month';
  const insights = await analyticsService.generateInsights(range, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'AI financial insights generated successfully',
    data: insights,
  });
};
