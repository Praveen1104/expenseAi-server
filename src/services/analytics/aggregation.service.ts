import { ExpenseModel } from '../../models/expense.model.js';
import { FilterQuery } from 'mongoose';

export type TimeRangeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface SummaryStatsResult {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  highestAmount: number;
  lowestAmount: number;
  recurringAmount: number;
  monthlyGrowthPercent: number;
  topCategory: string;
  topMerchant: string;
}

export interface CategoryBreakdownResult {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface MerchantLeaderboardResult {
  merchant: string;
  totalAmount: number;
  visitCount: number;
}

export interface TrendsDataResult {
  monthlyTrend: { date: string; amount: number }[];
  weeklyTrend: { day: string; amount: number }[];
  paymentMethodDistribution: { method: string; amount: number; count: number }[];
}

export class AggregationService {
  private static getDateFilter(
    timeRange: TimeRangeFilter,
    userId: string,
    customStart?: Date,
    customEnd?: Date
  ): { match: FilterQuery<unknown>; startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1); // default month start
    let endDate = now;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'week') {
      const day = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    }

    return {
      match: { userId: userId as any, transactionDate: { $gte: startDate, $lte: endDate } },
      startDate,
      endDate,
    };
  }

  public static async getSummaryStats(
    timeRange: TimeRangeFilter = 'month',
    userId: string,
    customStart?: Date,
    customEnd?: Date
  ): Promise<SummaryStatsResult> {
    const { match, startDate, endDate } = this.getDateFilter(timeRange, userId, customStart, customEnd);

    const durationMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = startDate;

    const [currentStats, recurringStats, topCategoryResult, topMerchantResult, prevStats] = await Promise.all([
      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            highestAmount: { $max: '$amount' },
            lowestAmount: { $min: '$amount' },
          },
        },
      ]),

      ExpenseModel.aggregate([
        { $match: { ...match, isRecurring: true } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),

      ExpenseModel.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),

      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: ['$normalizedMerchant', '$merchant'] },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),

      ExpenseModel.aggregate([
        { $match: { userId: userId as any, transactionDate: { $gte: prevStartDate, $lt: prevEndDate } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const stats = currentStats[0] || {
      totalExpenses: 0,
      totalAmount: 0,
      averageAmount: 0,
      highestAmount: 0,
      lowestAmount: 0,
    };

    const currentTotal = stats.totalAmount || 0;
    const prevTotal = prevStats[0]?.totalAmount || 0;

    let monthlyGrowthPercent = 0;
    if (prevTotal > 0) {
      monthlyGrowthPercent = Math.round(((currentTotal - prevTotal) / prevTotal) * 100 * 10) / 10;
    }

    return {
      totalExpenses: stats.totalExpenses,
      totalAmount: Math.round(currentTotal * 100) / 100,
      averageAmount: Math.round((stats.averageAmount || 0) * 100) / 100,
      highestAmount: Math.round((stats.highestAmount || 0) * 100) / 100,
      lowestAmount: Math.round((stats.lowestAmount || 0) * 100) / 100,
      recurringAmount: Math.round((recurringStats[0]?.totalAmount || 0) * 100) / 100,
      monthlyGrowthPercent,
      topCategory: topCategoryResult[0]?._id || 'N/A',
      topMerchant: topMerchantResult[0]?._id || 'N/A',
    };
  }

  public static async getCategoryBreakdown(
    timeRange: TimeRangeFilter = 'month',
    userId: string,
    customStart?: Date,
    customEnd?: Date
  ): Promise<CategoryBreakdownResult[]> {
    const { match } = this.getDateFilter(timeRange, userId, customStart, customEnd);

    const results = await ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const overallSum = results.reduce((sum, item) => sum + item.totalAmount, 0) || 1;

    return results.map((item) => ({
      category: item._id,
      totalAmount: Math.round(item.totalAmount * 100) / 100,
      count: item.count,
      percentage: Math.round((item.totalAmount / overallSum) * 100 * 10) / 10,
    }));
  }

  public static async getMerchantLeaderboard(
    timeRange: TimeRangeFilter = 'month',
    limit = 5,
    userId: string,
    customStart?: Date,
    customEnd?: Date
  ): Promise<MerchantLeaderboardResult[]> {
    const { match } = this.getDateFilter(timeRange, userId, customStart, customEnd);

    const results = await ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$normalizedMerchant', '$merchant'] },
          totalAmount: { $sum: '$amount' },
          visitCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
    ]);

    return results.map((item) => ({
      merchant: item._id,
      totalAmount: Math.round(item.totalAmount * 100) / 100,
      visitCount: item.visitCount,
    }));
  }

  public static async getTrendsData(
    timeRange: TimeRangeFilter = 'month',
    userId: string,
    customStart?: Date,
    customEnd?: Date
  ): Promise<TrendsDataResult> {
    const { match } = this.getDateFilter(timeRange, userId, customStart, customEnd);

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const [monthlyResults, weeklyResults, paymentResults] = await Promise.all([
      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dayOfWeek: '$transactionDate' },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentMethod',
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);

    const monthlyTrend = monthlyResults.map((item) => ({
      date: item._id,
      amount: Math.round(item.amount * 100) / 100,
    }));

    const weeklyTrend = weeklyResults.map((item) => ({
      day: daysMap[(item._id - 1) % 7] || 'Sun',
      amount: Math.round(item.amount * 100) / 100,
    }));

    const paymentMethodDistribution = paymentResults.map((item) => ({
      method: item._id,
      amount: Math.round(item.amount * 100) / 100,
      count: item.count,
    }));

    return {
      monthlyTrend,
      weeklyTrend,
      paymentMethodDistribution,
    };
  }
}
