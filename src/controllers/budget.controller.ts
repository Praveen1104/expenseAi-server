import { Request, Response } from 'express';
import { BudgetService } from '../services/budget/budget.service.js';
import { ForecastService } from '../services/budget/forecast.service.js';
import { RecommendationService } from '../services/budget/recommendation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { ValidationError, UnauthorizedError } from '../utils/apiError.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class BudgetController {
  public static async createBudget(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const { name, category, monthlyLimit, warningThreshold, currency, period } = req.body;
    if (!name || !category || monthlyLimit === undefined) {
      throw new ValidationError('Name, category, and monthlyLimit are required.');
    }

    const budget = await BudgetService.createBudget(
      { name, category, monthlyLimit, warningThreshold, currency, period },
      authReq.user.userId
    );

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.CREATED,
      message: 'Budget created successfully',
      data: budget,
    });
  }

  public static async getBudgets(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const budgets = await BudgetService.getAllBudgetsWithUsage(authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Budgets retrieved successfully',
      data: budgets,
    });
  }

  public static async updateBudget(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const { id } = req.params;
    const budget = await BudgetService.updateBudget(id, req.body, authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Budget updated successfully',
      data: budget,
    });
  }

  public static async deleteBudget(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const { id } = req.params;
    await BudgetService.deleteBudget(id, authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Budget deleted successfully',
    });
  }

  public static async getForecast(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const forecast = await ForecastService.generateForecast(authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Financial forecast generated successfully',
      data: forecast,
    });
  }

  public static async getRecommendations(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const recommendations = await RecommendationService.getRecommendations(authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'AI financial recommendations generated successfully',
      data: recommendations,
    });
  }

  public static async createSavingsGoal(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const { name, targetAmount, currentAmount, targetDate, notes } = req.body;
    if (!name || targetAmount === undefined || !targetDate) {
      throw new ValidationError('Name, targetAmount, and targetDate are required.');
    }

    const goal = await BudgetService.createSavingsGoal(
      { name, targetAmount, currentAmount, targetDate, notes },
      authReq.user.userId
    );

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.CREATED,
      message: 'Savings goal created successfully',
      data: goal,
    });
  }

  public static async getSavingsGoals(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const goals = await BudgetService.getSavingsGoals(authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Savings goals retrieved successfully',
      data: goals,
    });
  }

  public static async updateSavingsGoal(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError('User authentication details missing');
    }

    const { id } = req.params;
    const goal = await BudgetService.updateSavingsGoal(id, req.body, authReq.user.userId);

    return ApiResponse.success({
      res,
      statusCode: STATUS_CODES.OK,
      message: 'Savings goal updated successfully',
      data: goal,
    });
  }
}
