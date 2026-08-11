import { ExpenseModel } from '../../models/expense.model.js';
import { IBudget } from '../../models/budget.model.js';

export interface BudgetUsageResult {
  budgetId: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  alertLevel: 'safe' | 'warning' | 'critical' | 'exceeded';
  warningThreshold: number;
  transactionCount: number;
}

export interface CategoryForecastResult {
  category: string;
  currentMonthSpent: number;
  projectedMonthEnd: number;
  dailyAverage: number;
  remainingDaysInMonth: number;
  projectedOverspend: number;
}

export interface ForecastSummaryResult {
  projectedMonthEndTotal: number;
  currentMonthSpent: number;
  remainingBudgetEstimate: number;
  dailyBurnRate: number;
  daysElapsedInMonth: number;
  daysRemainingInMonth: number;
  savingsPotential: number;
  recurringTotal: number;
  subscriptionTotal: number;
  categoryForecasts: CategoryForecastResult[];
}

export class BudgetAggregationService {
  /**
   * Compute current month's actual spending for a single category.
   * All arithmetic done in MongoDB aggregation pipeline.
   */
  public static async getCategoryMonthSpend(
    category: string,
    userId: string
  ): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const match: Record<string, unknown> =
      category === 'Overall'
        ? { userId: userId as any, transactionDate: { $gte: monthStart, $lte: now } }
        : { userId: userId as any, category, transactionDate: { $gte: monthStart, $lte: now } };

    const result = await ExpenseModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return Math.round((result[0]?.total || 0) * 100) / 100;
  }

  /**
   * Compute budget usage for each active budget.
   * Runs parallel aggregation per budget category.
   */
  public static async computeBudgetUsage(
    budgets: IBudget[],
    userId: string
  ): Promise<BudgetUsageResult[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await Promise.all(
      budgets.map(async (budget) => {
        const match: Record<string, unknown> =
          budget.category === 'Overall'
            ? { userId: userId as any, transactionDate: { $gte: monthStart, $lte: now } }
            : {
                userId: userId as any,
                category: budget.category,
                transactionDate: { $gte: monthStart, $lte: now },
              };

        const [spendResult] = await ExpenseModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]);

        const spent = Math.round((spendResult?.total || 0) * 100) / 100;
        const transactionCount = spendResult?.count || 0;
        const remaining = Math.round((budget.monthlyLimit - spent) * 100) / 100;
        const usagePercent =
          budget.monthlyLimit > 0
            ? Math.round((spent / budget.monthlyLimit) * 1000) / 10
            : 0;

        let alertLevel: BudgetUsageResult['alertLevel'] = 'safe';
        if (usagePercent >= 110) alertLevel = 'exceeded';
        else if (usagePercent >= 100) alertLevel = 'critical';
        else if (usagePercent >= budget.warningThreshold) alertLevel = 'warning';

        return {
          budgetId: String(budget._id),
          category: budget.category,
          monthlyLimit: budget.monthlyLimit,
          spent,
          remaining,
          usagePercent,
          alertLevel,
          warningThreshold: budget.warningThreshold,
          transactionCount,
        };
      })
    );

    return results;
  }

  /**
   * Generate month-end spending forecast.
   * All projection math is deterministic — linear extrapolation from daily burn rate.
   */
  public static async computeForecast(userId: string): Promise<ForecastSummaryResult> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const daysElapsedInMonth = now.getDate();
    const totalDaysInMonth = monthEnd.getDate();
    const daysRemainingInMonth = totalDaysInMonth - daysElapsedInMonth;

    const [overallResult, recurringResult, categoryResult] = await Promise.all([
      // Current month total spend
      ExpenseModel.aggregate([
        { $match: { userId: userId as any, transactionDate: { $gte: monthStart, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Recurring / subscription spend
      ExpenseModel.aggregate([
        {
          $match: {
            userId: userId as any,
            transactionDate: { $gte: monthStart, $lte: now },
            isRecurring: true,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Per-category spend this month
      ExpenseModel.aggregate([
        { $match: { userId: userId as any, transactionDate: { $gte: monthStart, $lte: now } } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const currentMonthSpent = Math.round((overallResult[0]?.total || 0) * 100) / 100;
    const recurringTotal = Math.round((recurringResult[0]?.total || 0) * 100) / 100;

    // Linear burn rate projection
    const dailyBurnRate =
      daysElapsedInMonth > 0
        ? Math.round((currentMonthSpent / daysElapsedInMonth) * 100) / 100
        : 0;

    const projectedMonthEndTotal =
      Math.round((currentMonthSpent + dailyBurnRate * daysRemainingInMonth) * 100) / 100;

    // Per-category forecasts
    const categoryForecasts: CategoryForecastResult[] = categoryResult.map((cat) => {
      const currentMonthCatSpent = Math.round(cat.total * 100) / 100;
      const catDailyAvg =
        daysElapsedInMonth > 0
          ? Math.round((currentMonthCatSpent / daysElapsedInMonth) * 100) / 100
          : 0;
      const catProjected =
        Math.round((currentMonthCatSpent + catDailyAvg * daysRemainingInMonth) * 100) / 100;

      return {
        category: cat._id,
        currentMonthSpent: currentMonthCatSpent,
        projectedMonthEnd: catProjected,
        dailyAverage: catDailyAvg,
        remainingDaysInMonth: daysRemainingInMonth,
        projectedOverspend: 0, // populated by BudgetService when overlaid with budget limits
      };
    });

    // Naive savings potential: 10% below daily burn rate
    const savingsPotential =
      Math.round(dailyBurnRate * 0.1 * daysRemainingInMonth * 100) / 100;

    return {
      projectedMonthEndTotal,
      currentMonthSpent,
      remainingBudgetEstimate: 0, // set by BudgetService overlay
      dailyBurnRate,
      daysElapsedInMonth,
      daysRemainingInMonth,
      savingsPotential,
      recurringTotal,
      subscriptionTotal: recurringTotal,
      categoryForecasts,
    };
  }
}
