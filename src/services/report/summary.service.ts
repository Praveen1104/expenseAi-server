import { SummaryStatsResult, CategoryBreakdownResult, MerchantLeaderboardResult } from '../analytics/aggregation.service.js';
import { EnrichedForecast } from '../budget/forecast.service.js';
import { BudgetWithUsage } from '../budget/budget.service.js';
import { openAIClient } from '../../lib/openai.client.js';
import { redisConfig } from '../../config/redis.config.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../lib/logger.js';

export interface AISummaryData {
  financialHighlights: string;
  topSpendingCategory: string;
  largestMerchant: string;
  biggestSavingsOpportunity: string;
  monthlySummary: string;
  actionableAdvice: string[];
}

const SUMMARY_CACHE_TTL = 24 * 60 * 60; // 24 hours

export class SummaryService {
  /**
   * Generates AI Executive Summary for financial reports.
   * STRICT GUARANTEE: AI ONLY receives deterministic pre-computed data.
   * AI NEVER performs arithmetic, total calculation, or chart rendering.
   */
  public static async generateSummary(
    summaryStats: SummaryStatsResult,
    categoryBreakdown: CategoryBreakdownResult[],
    merchantLeaderboard: MerchantLeaderboardResult[],
    forecast?: EnrichedForecast,
    budgets?: BudgetWithUsage[]
  ): Promise<AISummaryData> {
    const redis = redisConfig.getClient();
    const cacheKey = `ai_summary:${summaryStats.totalExpenses}:${summaryStats.totalAmount}:${summaryStats.topCategory}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('[SummaryService] Cache hit for AI Executive Summary');
        return JSON.parse(cached);
      }
    } catch {
      // Redis fallback
    }

    const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('placeholder');
    let summary: AISummaryData;

    if (isMock) {
      logger.warn('[SummaryService] OpenAI key missing/placeholder. Returning mock executive summary.');
      summary = {
        financialHighlights: `Total expenditure recorded at $${summaryStats.totalAmount.toFixed(2)} across ${summaryStats.totalExpenses} transactions. Monthly growth stood at ${summaryStats.monthlyGrowthPercent}%.`,
        topSpendingCategory: `Primary expenditure driver was ${summaryStats.topCategory} total ($${(categoryBreakdown[0]?.totalAmount || 0).toFixed(2)}).`,
        largestMerchant: `Highest transaction volume logged at ${summaryStats.topMerchant}.`,
        biggestSavingsOpportunity: summaryStats.recurringAmount > 0
          ? `Auditing recurring subscriptions ($${summaryStats.recurringAmount.toFixed(2)}) offers immediate cost optimization.`
          : 'Consolidating discretionary purchases can reduce overhead by ~10%.',
        monthlySummary: `Financial velocity remained within operational thresholds. Highest single transaction was $${summaryStats.highestAmount.toFixed(2)}.`,
        actionableAdvice: [
          `Monitor spending under ${summaryStats.topCategory} closely to prevent threshold breaches.`,
          `Set automated category alerts when expenditure hits 80% of budget limit.`,
          `Review monthly recurring subscriptions for non-essential services.`,
        ],
      };
    } else {
      try {
        const client = openAIClient.getClient();
        const prompt = `
You are an Enterprise Financial Controller AI. You will receive PRE-COMPUTED DETERMINISTIC metrics from our accounting database.
Your job is ONLY to summarize these facts into a high-level C-Suite Executive Summary.
DO NOT CALCULATE TOTALS. DO NOT ALTER NUMBERS. DO NOT ESTIMATE MATH.

=== DATA SNAPSHOT ===
Total Spend: $${summaryStats.totalAmount}
Total Transactions: ${summaryStats.totalExpenses}
Average Transaction: $${summaryStats.averageAmount}
Highest Expense: $${summaryStats.highestAmount}
Monthly Growth Rate: ${summaryStats.monthlyGrowthPercent}%
Top Category: ${summaryStats.topCategory} ($${categoryBreakdown[0]?.totalAmount || 0})
Top Merchant: ${summaryStats.topMerchant}
Recurring Spend: $${summaryStats.recurringAmount}
Forecasted Month-End Spend: $${forecast?.projectedMonthEndTotal || summaryStats.totalAmount}
Top Merchants Concentrated: ${JSON.stringify(merchantLeaderboard)}
Active Budgets Count: ${budgets?.length || 0}

Generate a JSON object matching this schema:
{
  "financialHighlights": "1-2 sentence executive overview",
  "topSpendingCategory": "Summary of top category performance",
  "largestMerchant": "Summary of primary merchant concentration",
  "biggestSavingsOpportunity": "Key area to save money",
  "monthlySummary": "Brief narrative of overall month",
  "actionableAdvice": ["point 1", "point 2", "point 3"]
}
`.trim();

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a certified AI Financial Executive. Provide narrative summaries based ONLY on provided exact figures.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || '{}';
        summary = JSON.parse(content);
      } catch (error) {
        logger.error('[SummaryService] Failed to generate AI executive summary:', error);
        throw error;
      }
    }

    try {
      await redis.setex(cacheKey, SUMMARY_CACHE_TTL, JSON.stringify(summary));
    } catch {
      // Redis fallback
    }

    return summary;
  }
}
