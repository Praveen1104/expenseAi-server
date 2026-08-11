import { SummaryStatsResult, CategoryBreakdownResult, MerchantLeaderboardResult } from '../../services/analytics/aggregation.service.js';

export class InsightPromptBuilder {
  public static getPrompt(
    summary: SummaryStatsResult,
    categories: CategoryBreakdownResult[],
    merchants: MerchantLeaderboardResult[]
  ): string {
    return `You are a Senior Financial Advisor and Wealth Manager AI.
Below are the DETERMINISTIC calculated financial analytics from MongoDB:

DETERMINISTIC NUMBERS:
- Total Expenditure: $${summary.totalAmount.toFixed(2)} (${summary.totalExpenses} transactions)
- Monthly Growth: ${summary.monthlyGrowthPercent > 0 ? '+' : ''}${summary.monthlyGrowthPercent}% vs prior period
- Average Ticket: $${summary.averageAmount.toFixed(2)}
- Highest Transaction Ticket: $${summary.highestAmount.toFixed(2)}
- Recurring Monthly Subscriptions: $${summary.recurringAmount.toFixed(2)}
- Top Category: ${summary.topCategory}
- Top Merchant: ${summary.topMerchant}

CATEGORY BREAKDOWN:
${categories.map((c) => `- ${c.category}: $${c.totalAmount.toFixed(2)} (${c.percentage}%)`).join('\n')}

TOP MERCHANTS LEADERBOARD:
${merchants.map((m) => `- ${m.merchant}: $${m.totalAmount.toFixed(2)} (${m.visitCount} visits)`).join('\n')}

INSTRUCTIONS:
You MUST NOT perform any math or alter these numbers.
Provide an insightful financial commentary and recommendations in valid JSON format matching:
{
  "monthlySummary": "1 paragraph executive synthesis of current spending",
  "topSpendingReason": "Primary spending driver explanation based on data",
  "overspendingWarning": "Specific category or merchant warning if high spend detected",
  "savingSuggestions": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
  "recurringSubscriptionAdvice": "Targeted advice on recurring subscriptions and regular expenses",
  "budgetRecommendation": number (suggested max target monthly budget),
  "interestingSpendingPattern": "Unique financial habit observation",
  "positiveFinancialHabits": "Encouraging positive feedback"
}`;
  }
}
