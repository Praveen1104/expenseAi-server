import { BudgetWithUsage } from './budget.service.js';
import { EnrichedForecast } from './forecast.service.js';
import { SummaryStatsResult } from '../analytics/aggregation.service.js';

export class BudgetPromptBuilder {
  /**
   * Assemble a structured prompt containing ONLY pre-computed deterministic numbers.
   * AI receives the data — it never performs arithmetic.
   */
  public static buildRecommendationPrompt(
    budgets: BudgetWithUsage[],
    forecast: EnrichedForecast,
    summary: SummaryStatsResult
  ): string {
    const budgetSummaryLines = budgets
      .map((b) => {
        const u = b.usage;
        if (!u) return '';
        return `  - ${b.category}: Limit $${b.monthlyLimit}, Spent $${u.spent} (${u.usagePercent}% used), Remaining $${u.remaining}, Alert: ${u.alertLevel}`;
      })
      .filter(Boolean)
      .join('\n');

    const overBudgetLines =
      forecast.overBudgetCategories.length > 0
        ? forecast.overBudgetCategories
            .map(
              (o: any) =>
                `  - ${o.category}: Projected $${o.projected} vs Budget $${o.budgetLimit} (over by $${o.overBy})`
            )
            .join('\n')
        : '  None projected.';

    const categoryForecastLines = forecast.categoryForecasts
      .slice(0, 6)
      .map(
        (cf: any) =>
          `  - ${cf.category}: Current $${cf.currentMonthSpent}, Projected Month-End $${cf.projectedMonthEnd}, Daily Avg $${cf.dailyAverage}`
      )
      .join('\n');

    return `
You are a certified AI Financial Advisor. You will receive DETERMINISTIC numbers computed by our analytics engine. 
Your task is ONLY to explain these numbers and generate financial advice. 
DO NOT perform any calculations, sums, percentages, or projections yourself.

=== CURRENT MONTH STATISTICS ===
Total Spent This Month: $${summary.totalAmount}
Number of Transactions: ${summary.totalExpenses}
Average Transaction: $${summary.averageAmount}
Highest Expense: $${summary.highestAmount}
Top Spending Category: ${summary.topCategory}
Top Merchant: ${summary.topMerchant}
Recurring/Subscription Spend: $${summary.recurringAmount}
Period Growth vs Last Month: ${summary.monthlyGrowthPercent}%

=== MONTH-END FORECAST ===
Current Month Spent: $${forecast.currentMonthSpent}
Projected Month-End Total: $${forecast.projectedMonthEndTotal}
Daily Burn Rate: $${forecast.dailyBurnRate}
Days Elapsed: ${forecast.daysElapsedInMonth}
Days Remaining: ${forecast.daysRemainingInMonth}
Savings Potential: $${forecast.savingsPotential}
Recurring Total: $${forecast.recurringTotal}

=== ACTIVE BUDGETS & USAGE ===
${budgetSummaryLines || '  No active budgets set.'}

=== OVER-BUDGET PROJECTIONS ===
${overBudgetLines}

=== CATEGORY FORECASTS ===
${categoryForecastLines}

=== TASK ===
Based ONLY on the numbers above, generate a JSON response with these exact fields:

{
  "budgetSummary": "2-3 sentence overview of budget health",
  "overspendingAdvice": "Specific advice about over-budget or near-limit categories",
  "savingOpportunities": ["tip 1", "tip 2", "tip 3"],
  "subscriptionAdvice": "Advice about recurring spend of $${summary.recurringAmount}",
  "spendingHabitAnalysis": "Pattern analysis based on top category ${summary.topCategory} and top merchant ${summary.topMerchant}",
  "financialRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "weeklyReview": "What to focus on in the next 7 days given $${forecast.dailyBurnRate}/day burn rate",
  "monthlyReview": "End-of-month strategy to keep spending under projected $${forecast.projectedMonthEndTotal}"
}
`.trim();
  }
}
