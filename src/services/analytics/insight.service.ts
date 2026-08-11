import { openAIClient } from '../../lib/openai.client.js';
import { InsightPromptBuilder } from '../../lib/vision/insightPromptBuilder.js';
import { SummaryStatsResult, CategoryBreakdownResult, MerchantLeaderboardResult } from './aggregation.service.js';
import { InsightHistoryModel, IInsightHistory, AIInsightsData } from '../../models/insightHistory.model.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../lib/logger.js';

export class InsightService {
  public static async generateInsights(
    summary: SummaryStatsResult,
    categories: CategoryBreakdownResult[],
    merchants: MerchantLeaderboardResult[],
    userId: string
  ): Promise<IInsightHistory> {
    const startTime = Date.now();
    const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('placeholder');

    let recommendations: AIInsightsData;
    let tokenUsage = { promptTokens: 400, completionTokens: 250, totalTokens: 650 };
    let provider = 'OpenAI-Mock';

    if (isMock) {
      logger.warn('[InsightService] OpenAI API Key missing or placeholder. Using mock financial insights advisor.');
      recommendations = {
        monthlySummary: `Total expenditure reached $${summary.totalAmount.toFixed(2)} across ${summary.totalExpenses} transactions this month, with ${summary.topCategory} representing the single largest category driver.`,
        topSpendingReason: `High volume of transactions recorded at ${summary.topMerchant} and increased spending in ${summary.topCategory}.`,
        overspendingWarning: summary.monthlyGrowthPercent > 10
          ? `Expenditure grew by +${summary.monthlyGrowthPercent}% compared to the previous period. Consider capping non-essential items.`
          : 'Spending remains within normal operating parameters with no severe overspending detected.',
        savingSuggestions: [
          `Review recurring subscriptions ($${summary.recurringAmount.toFixed(2)} total) to cancel unused services.`,
          `Consolidate ${summary.topCategory} purchases to leverage volume discounts.`,
          'Set up weekly spending alerts for discretionary purchases.',
        ],
        recurringSubscriptionAdvice: `You currently spend $${summary.recurringAmount.toFixed(2)} on recurring merchants. Auditing these can save up to 15% annually.`,
        budgetRecommendation: Math.round(summary.totalAmount * 0.9),
        interestingSpendingPattern: `Frequent visits logged at ${summary.topMerchant} (${merchants[0]?.visitCount || 1} visits).`,
        positiveFinancialHabits: 'Consistent receipt tracking and transaction logging maintains complete audit transparency.',
      };
    } else {
      try {
        const client = openAIClient.getClient();
        const prompt = InsightPromptBuilder.getPrompt(summary, categories, merchants);

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a certified AI Financial Advisor. Explain financial insights based ONLY on the provided deterministic numbers.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 1200,
        });

        const content = response.choices[0]?.message?.content || '{}';
        recommendations = JSON.parse(content);
        provider = 'OpenAI';
        tokenUsage = {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        };
      } catch (error) {
        logger.error('[InsightService] Failed to generate AI insights via OpenAI:', error);
        throw error;
      }
    }

    const latency = Date.now() - startTime;

    const insightRecord = await InsightHistoryModel.create({
      userId: userId as any,
      analyticsSnapshot: { summary, categories, merchants },
      aiSummary: recommendations.monthlySummary,
      recommendations,
      provider,
      modelName: 'gpt-4o-mini',
      tokenUsage,
      latency,
    });

    logger.info(`[InsightService] Generated AI Financial Insights in ${latency}ms (Record ID: ${insightRecord._id})`);

    return insightRecord;
  }
}
