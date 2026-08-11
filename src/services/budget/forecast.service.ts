import { BudgetModel } from '../../models/budget.model.js';
import { BudgetAggregationService, ForecastSummaryResult } from './budgetAggregation.service.js';
import { redisConfig } from '../../config/redis.config.js';
import { logger } from '../../lib/logger.js';

const FORECAST_CACHE_TTL = 30 * 60; // 30 minutes

export interface EnrichedForecast extends ForecastSummaryResult {
  overBudgetCategories: {
    category: string;
    budgetLimit: number;
    projected: number;
    projectedOverspend: number;
    overBy: number;
  }[];
}

export class ForecastService {
  /**
   * Generate the full deterministic month-end forecast.
   * Overlays active budget limits on top of the aggregation projection.
   * Zero AI math — all numbers come from the database.
   */
  public static async generateForecast(userId: string): Promise<EnrichedForecast> {
    const redis = redisConfig.getClient();
    const cacheKey = `budget:forecast:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`[ForecastService] Cache hit for forecast for user ${userId}`);
        return JSON.parse(cached);
      }
    } catch {
      // Redis fallback
    }

    const [rawForecast, activeBudgets] = await Promise.all([
      BudgetAggregationService.computeForecast(userId),
      BudgetModel.find({ enabled: true, userId }),
    ]);

    // Build a budget-limit lookup by category
    const budgetMap = new Map<string, number>();
    activeBudgets.forEach((b) => budgetMap.set(b.category, b.monthlyLimit));

    // Overlay budget limits on category forecasts
    const enrichedCategoryForecasts = rawForecast.categoryForecasts.map((cf) => {
      const limit = budgetMap.get(cf.category);
      const projectedOverspend =
        limit !== undefined && cf.projectedMonthEnd > limit
          ? Math.round((cf.projectedMonthEnd - limit) * 100) / 100
          : 0;
      return { ...cf, projectedOverspend };
    });

    // Find over-budget categories
    const overBudgetCategories = enrichedCategoryForecasts
      .filter((cf) => cf.projectedOverspend > 0)
      .map((cf) => ({
        category: cf.category,
        budgetLimit: budgetMap.get(cf.category) ?? 0,
        projected: cf.projectedMonthEnd,
        projectedOverspend: cf.projectedOverspend,
        overBy: Math.round((cf.projectedMonthEnd - (budgetMap.get(cf.category) ?? 0)) * 100) / 100,
      }));

    // Compute remaining budget estimate (if overall budget exists)
    const overallBudget = budgetMap.get('Overall');
    const remainingBudgetEstimate = overallBudget
      ? Math.round((overallBudget - rawForecast.currentMonthSpent) * 100) / 100
      : 0;

    const result: EnrichedForecast = {
      ...rawForecast,
      categoryForecasts: enrichedCategoryForecasts,
      remainingBudgetEstimate,
      overBudgetCategories,
    };

    try {
      await redis.setex(cacheKey, FORECAST_CACHE_TTL, JSON.stringify(result));
    } catch {
      // Redis fallback
    }

    logger.info(
      `[ForecastService] Forecast generated for user ${userId}: projected month-end $${result.projectedMonthEndTotal}`
    );

    return result;
  }
}
