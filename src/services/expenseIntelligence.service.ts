import { MerchantNormalizer } from './intelligence/merchantNormalizer.js';
import { CategoryClassifier } from './intelligence/categoryClassifier.js';
import { TagGenerator } from './intelligence/tagGenerator.js';
import { RecurringDetector } from './intelligence/recurringDetector.js';
import { ConfidenceService } from './intelligence/confidenceService.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { merchantRepository } from '../repositories/merchant.repository.js';
import { redisConfig } from '../config/redis.config.js';
import { IExpense } from '../models/expense.model.js';
import { NotFoundError } from '../utils/apiError.js';
import { logger } from '../lib/logger.js';

const REDIS_MERCHANT_INTEL_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export class ExpenseIntelligenceService {
  public async enrichExpense(expenseId: string): Promise<IExpense> {
    const startTime = Date.now();
    logger.info(`[ExpenseIntelligenceService] Starting AI enrichment for Expense ID: ${expenseId}`);

    const expense = await expenseRepository.findById(expenseId);
    if (!expense) {
      throw new NotFoundError(`Expense with ID "${expenseId}" was not found for AI enrichment`);
    }

    // 1. Merchant Normalization
    const normResult = MerchantNormalizer.normalize(expense.merchant);

    // 2. Redis Caching Check for Merchant Intelligence
    const redisClient = redisConfig.getClient();
    const redisKey = `merchant:intel:${normResult.normalizedName.toLowerCase()}`;
    let cachedIntelStr: string | null = null;
    try {
      cachedIntelStr = await redisClient.get(redisKey);
    } catch {
      // Redis fallback gracefully ignored
    }

    let category = expense.category;
    let categoryConf = 0.95;

    if (cachedIntelStr) {
      logger.info(`[ExpenseIntelligenceService] Redis cache hit for merchant "${normResult.normalizedName}"`);
      const cached = JSON.parse(cachedIntelStr);
      category = cached.category || category;
    } else {
      // 3. Category Classification
      const catResult = CategoryClassifier.classify(expense.merchant, expense.title, expense.notes);
      category = catResult.category;
      categoryConf = catResult.confidence;

      // Cache merchant intelligence in Redis for 30 days
      try {
        await redisClient.setex(
          redisKey,
          REDIS_MERCHANT_INTEL_TTL,
          JSON.stringify({
            normalizedName: normResult.normalizedName,
            merchantType: normResult.merchantType,
            category,
          })
        );
      } catch {
        // Ignored
      }
    }

    // 4. Tag Generation
    const tagResult = TagGenerator.generateTags(
      expense.merchant,
      category,
      expense.title,
      expense.tags
    );

    // 5. Recurring Detection
    const existingMerchant = await merchantRepository.findByNormalizedName(normResult.normalizedName);
    const visitCount = (existingMerchant?.visitCount || 0) + 1;
    const recurringResult = RecurringDetector.detect(expense.merchant, visitCount);

    // 6. Confidence Scoring
    const confidenceScores = ConfidenceService.computeScores(
      normResult.confidence,
      categoryConf,
      tagResult.confidence
    );

    // 7. AI One-Sentence Purchase Summary Generation
    const aiSummary = `${category} transaction of $${expense.amount.toFixed(2)} at ${normResult.normalizedName} (${normResult.merchantType}).`;

    // 8. Record Merchant Profile Visit in MongoDB
    const merchantProfile = await merchantRepository.recordVisit(
      expense.merchant,
      normResult.normalizedName,
      normResult.merchantType,
      category,
      expense.amount,
      recurringResult.isRecurring,
      recurringResult.frequency
    );

    // 9. Update Expense Document in MongoDB
    const updatedExpense = await expenseRepository.update(expenseId, {
      normalizedMerchant: normResult.normalizedName,
      merchantId: merchantProfile._id as unknown as IExpense['merchantId'],
      category,
      tags: tagResult.tags,
      aiSummary,
      confidenceScores,
      isRecurring: recurringResult.isRecurring,
      recurringFrequency: recurringResult.frequency,
    });

    const totalLatencyMs = Date.now() - startTime;
    logger.info(
      `[ExpenseIntelligenceService] Expense ID: ${expenseId} enriched successfully in ${totalLatencyMs}ms. Normalized Merchant: "${normResult.normalizedName}", Category: "${category}"`
    );

    return updatedExpense || expense;
  }
}

export const expenseIntelligenceService = new ExpenseIntelligenceService();
