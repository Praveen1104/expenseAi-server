import mongoose from 'mongoose';
import { BudgetModel, IBudget } from '../../models/budget.model.js';
import { SavingsGoalModel, ISavingsGoal } from '../../models/savingsGoal.model.js';
import { BudgetAggregationService, BudgetUsageResult } from './budgetAggregation.service.js';
import { redisConfig } from '../../config/redis.config.js';
import { logger } from '../../lib/logger.js';

const BUDGET_CACHE_TTL = 30 * 60; // 30 minutes

export interface CreateBudgetPayload {
  name: string;
  category: IBudget['category'];
  monthlyLimit: number;
  warningThreshold?: number;
  currency?: string;
  period?: IBudget['period'];
}

export interface UpdateBudgetPayload {
  name?: string;
  monthlyLimit?: number;
  warningThreshold?: number;
  currency?: string;
  enabled?: boolean;
}

export interface BudgetWithUsage extends IBudget {
  usage?: BudgetUsageResult;
}

export class BudgetService {
  private static getCacheKey = (userId: string) => `budgets:all:${userId}`;

  /** ── CRUD ── */

  public static async createBudget(payload: CreateBudgetPayload, userId: string): Promise<IBudget> {
    // Validate: no duplicate active budget per category for this user
    const existing = await BudgetModel.findOne({
      userId,
      category: payload.category,
      enabled: true,
    });
    if (existing) {
      throw new Error(
        `An active budget already exists for category "${payload.category}". Update or disable it first.`
      );
    }

    if (payload.monthlyLimit <= 0) {
      throw new Error('Monthly limit must be a positive number.');
    }

    const budget = await BudgetModel.create({
      ...payload,
      userId,
    });
    await this.invalidateCache(userId);
    logger.info(`[BudgetService] Created budget: ${budget._id} (${payload.category}) for user ${userId}`);
    return budget;
  }

  public static async updateBudget(
    id: string,
    payload: UpdateBudgetPayload,
    userId: string
  ): Promise<IBudget> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid budget ID.');
    }

    if (payload.monthlyLimit !== undefined && payload.monthlyLimit <= 0) {
      throw new Error('Monthly limit must be a positive number.');
    }

    const budget = await BudgetModel.findOneAndUpdate(
      { _id: id, userId },
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!budget) throw new Error(`Budget ${id} not found.`);

    await this.invalidateCache(userId);
    logger.info(`[BudgetService] Updated budget: ${id} for user ${userId}`);
    return budget;
  }

  public static async deleteBudget(id: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid budget ID.');
    }
    const result = await BudgetModel.findOneAndDelete({ _id: id, userId });
    if (!result) throw new Error(`Budget ${id} not found.`);

    await this.invalidateCache(userId);
    logger.info(`[BudgetService] Deleted budget: ${id} for user ${userId}`);
  }

  /** ── READ ── */

  public static async getAllBudgetsWithUsage(userId: string): Promise<BudgetWithUsage[]> {
    const redis = redisConfig.getClient();
    const cacheKey = this.getCacheKey(userId);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`[BudgetService] Cache hit for budgets for user ${userId}`);
        return JSON.parse(cached);
      }
    } catch {
      // Redis fallback
    }

    const budgets = await BudgetModel.find({ enabled: true, userId }).sort({ createdAt: -1 });
    const usageResults = await BudgetAggregationService.computeBudgetUsage(budgets, userId);

    const result: BudgetWithUsage[] = budgets.map((budget) => {
      const usage = usageResults.find(
        (u) => u.budgetId === String(budget._id)
      );
      return Object.assign(budget.toObject(), { usage });
    });

    try {
      await redis.setex(cacheKey, BUDGET_CACHE_TTL, JSON.stringify(result));
    } catch {
      // Redis fallback
    }

    return result;
  }

  /** ── SAVINGS GOALS ── */

  public static async createSavingsGoal(
    payload: {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      targetDate: string;
      notes?: string;
    },
    userId: string
  ): Promise<ISavingsGoal> {
    if (payload.targetAmount <= 0) {
      throw new Error('Target amount must be a positive number.');
    }
    const goal = await SavingsGoalModel.create({
      ...payload,
      userId,
      targetDate: new Date(payload.targetDate),
    });
    logger.info(`[BudgetService] Created savings goal: ${goal._id} for user ${userId}`);
    return goal;
  }

  public static async getSavingsGoals(userId: string): Promise<ISavingsGoal[]> {
    return SavingsGoalModel.find({ status: { $in: ['active', 'paused'] }, userId }).sort({
      targetDate: 1,
    });
  }

  public static async updateSavingsGoal(
    id: string,
    payload: Partial<{
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: string;
      status: ISavingsGoal['status'];
      notes: string;
    }>,
    userId: string
  ): Promise<ISavingsGoal> {
    const goal = await SavingsGoalModel.findOneAndUpdate(
      { _id: id, userId },
      {
        ...payload,
        ...(payload.targetDate && { targetDate: new Date(payload.targetDate) }),
      },
      { new: true, runValidators: true }
    );
    if (!goal) throw new Error(`Savings goal ${id} not found.`);
    return goal;
  }

  /** ── PRIVATE ── */

  private static async invalidateCache(userId: string): Promise<void> {
    try {
      const redis = redisConfig.getClient();
      await redis.del(this.getCacheKey(userId));
    } catch {
      // Redis fallback
    }
  }
}
