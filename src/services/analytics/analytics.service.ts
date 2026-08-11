import {
  AggregationService,
  TimeRangeFilter,
  SummaryStatsResult,
  CategoryBreakdownResult,
  MerchantLeaderboardResult,
  TrendsDataResult,
} from './aggregation.service.js';
import { InsightService } from './insight.service.js';
import { IInsightHistory } from '../../models/insightHistory.model.js';
import { redisConfig } from '../../config/redis.config.js';
import { logger } from '../../lib/logger.js';

const ANALYTICS_CACHE_TTL = 15 * 60; // 15 mins (900 seconds)
const INSIGHTS_CACHE_TTL = 24 * 60 * 60; // 24 hours (86400 seconds)

export class AnalyticsService {
  public async getSummary(timeRange: TimeRangeFilter = 'month', userId: string): Promise<SummaryStatsResult> {
    const redisClient = redisConfig.getClient();
    const cacheKey = `analytics:summary:${userId}:${timeRange}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[AnalyticsService] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Redis fallback
    }

    const summary = await AggregationService.getSummaryStats(timeRange, userId);

    try {
      await redisClient.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(summary));
    } catch {
      // Redis fallback
    }

    return summary;
  }

  public async getCategories(timeRange: TimeRangeFilter = 'month', userId: string): Promise<CategoryBreakdownResult[]> {
    const redisClient = redisConfig.getClient();
    const cacheKey = `analytics:categories:${userId}:${timeRange}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[AnalyticsService] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }

    const categories = await AggregationService.getCategoryBreakdown(timeRange, userId);

    try {
      await redisClient.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(categories));
    } catch {
      // Fallback
    }

    return categories;
  }

  public async getMerchants(
    timeRange: TimeRangeFilter = 'month',
    limit = 5,
    userId: string
  ): Promise<MerchantLeaderboardResult[]> {
    const redisClient = redisConfig.getClient();
    const cacheKey = `analytics:merchants:${userId}:${timeRange}:${limit}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[AnalyticsService] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }

    const merchants = await AggregationService.getMerchantLeaderboard(timeRange, limit, userId);

    try {
      await redisClient.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(merchants));
    } catch {
      // Fallback
    }

    return merchants;
  }

  public async getTrends(timeRange: TimeRangeFilter = 'month', userId: string): Promise<TrendsDataResult> {
    const redisClient = redisConfig.getClient();
    const cacheKey = `analytics:trends:${userId}:${timeRange}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[AnalyticsService] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }

    const trends = await AggregationService.getTrendsData(timeRange, userId);

    try {
      await redisClient.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(trends));
    } catch {
      // Fallback
    }

    return trends;
  }

  public async generateInsights(timeRange: TimeRangeFilter = 'month', userId: string): Promise<IInsightHistory> {
    const redisClient = redisConfig.getClient();
    const cacheKey = `analytics:insights:${userId}:${timeRange}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[AnalyticsService] Cache hit for AI Insights ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }

    const [summary, categories, merchants] = await Promise.all([
      AggregationService.getSummaryStats(timeRange, userId),
      AggregationService.getCategoryBreakdown(timeRange, userId),
      AggregationService.getMerchantLeaderboard(timeRange, 5, userId),
    ]);

    const insight = await InsightService.generateInsights(summary, categories, merchants, userId);

    try {
      await redisClient.setex(cacheKey, INSIGHTS_CACHE_TTL, JSON.stringify(insight));
    } catch {
      // Fallback
    }

    return insight;
  }
}

export const analyticsService = new AnalyticsService();
