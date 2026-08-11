import { openAIClient } from '../../lib/openai.client.js';
import { BudgetService } from './budget.service.js';
import { ForecastService } from './forecast.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { BudgetPromptBuilder } from './budgetPromptBuilder.js';
import { redisConfig } from '../../config/redis.config.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../lib/logger.js';

const REC_CACHE_TTL = 24 * 60 * 60; // 24 hours

export interface BudgetRecommendationResult {
  budgetSummary: string;
  overspendingAdvice: string;
  savingOpportunities: string[];
  subscriptionAdvice: string;
  spendingHabitAnalysis: string;
  financialRecommendations: string[];
  weeklyReview: string;
  monthlyReview: string;
}

export class RecommendationService {
  public static async getRecommendations(userId: string): Promise<BudgetRecommendationResult> {
    const redis = redisConfig.getClient();
    const cacheKey = `budget:recommendations:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`[RecommendationService] Cache hit for user ${userId}`);
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }

    const [budgets, forecast, summary] = await Promise.all([
      BudgetService.getAllBudgetsWithUsage(userId),
      ForecastService.generateForecast(userId),
      analyticsService.getSummary('month', userId),
    ]);

    const prompt = BudgetPromptBuilder.buildRecommendationPrompt(budgets, forecast, summary);

    const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('placeholder');
    let advice: BudgetRecommendationResult;

    if (isMock) {
      logger.warn('[RecommendationService] OpenAI key missing. Returning mock advice.');
      advice = {
        budgetSummary: 'Your budgets are healthy, but watch your overall limit.',
        overspendingAdvice: 'No category is currently projected to exceed budget limits.',
        savingOpportunities: [
          'Audit recurring subscriptions.',
          'Consolidate shopping orders.'
        ],
        subscriptionAdvice: `You spent $${summary.recurringAmount} on subscriptions. Consider reviewing them.`,
        spendingHabitAnalysis: `Your top category was ${summary.topCategory} and top merchant was ${summary.topMerchant}.`,
        financialRecommendations: ['Setup recurring savings transfers', 'Review budget limits'],
        weeklyReview: `Current burn rate is $${forecast.dailyBurnRate}/day.`,
        monthlyReview: `Keep total spending under $${forecast.projectedMonthEndTotal}.`
      };
    } else {
      const openai = openAIClient.getClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a certified AI Financial Advisor. Explain budget insights based ONLY on the provided deterministic numbers.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      advice = JSON.parse(content);
    }

    try {
      await redis.setex(cacheKey, REC_CACHE_TTL, JSON.stringify(advice));
    } catch {
      // Fallback
    }

    return advice;
  }
}
