import { Request, Response } from 'express';
import { expenseService } from '../services/expense.service.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
} from '../validators/expense.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { ValidationError, UnauthorizedError } from '../utils/apiError.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const createExpense = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const result = createExpenseSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError('Invalid expense payload', result.error.flatten().fieldErrors);
  }

  const expense = await expenseService.createExpense({
    ...result.data,
    userId: authReq.user.userId,
  });

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.CREATED,
    message: 'Expense created successfully',
    data: expense,
  });
};

export const getExpenses = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const result = expenseQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError('Invalid expense query parameters', result.error.flatten().fieldErrors);
  }

  const paginatedResult = await expenseService.getExpenses(result.data, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Expenses retrieved successfully',
    data: paginatedResult.data,
    meta: {
      pagination: paginatedResult.pagination,
      summary: paginatedResult.summary,
    },
  });
};

export const getExpenseById = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  const expense = await expenseService.getExpenseById(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Expense retrieved successfully',
    data: expense,
  });
};

export const updateExpense = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  const result = updateExpenseSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError('Invalid expense update payload', result.error.flatten().fieldErrors);
  }

  const updatedExpense = await expenseService.updateExpense(id, result.data, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Expense updated successfully',
    data: updatedExpense,
  });
};

export const deleteExpense = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  await expenseService.deleteExpense(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Expense deleted successfully',
  });
};

export const enrichExpense = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  // Verify ownership before triggering AI enrichment (IDOR prevention)
  await expenseService.getExpenseById(id, authReq.user.userId);

  const { expenseIntelligenceService } = await import('../services/expenseIntelligence.service.js');
  const enrichedExpense = await expenseIntelligenceService.enrichExpense(id);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Expense enriched with AI financial intelligence successfully',
    data: enrichedExpense,
  });
};
