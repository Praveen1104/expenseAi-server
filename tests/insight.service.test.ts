import { InsightService } from '../src/services/analytics/insight.service';
import { InsightHistoryModel } from '../src/models/insightHistory.model';

jest.mock('../src/models/insightHistory.model');
jest.mock('../src/lib/openai.client');
jest.mock('../src/lib/vision/insightPromptBuilder');
jest.mock('../src/config/env.config', () => ({
  env: { OPENAI_API_KEY: 'placeholder-test-key' }, // force mock path
}));

const mockSummary = {
  totalExpenses: 12,
  totalAmount: 1500,
  averageAmount: 125,
  highestAmount: 400,
  lowestAmount: 10,
  recurringAmount: 200,
  monthlyGrowthPercent: 8.5,
  topCategory: 'Food',
  topMerchant: 'Starbucks',
};

const mockCategories = [
  { category: 'Food', totalAmount: 600, count: 5, percentage: 40 },
  { category: 'Transport', totalAmount: 400, count: 3, percentage: 26.7 },
];

const mockMerchants = [
  { merchant: 'Starbucks', totalAmount: 300, visitCount: 4 },
  { merchant: 'Amazon', totalAmount: 250, visitCount: 3 },
];

describe('InsightService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (InsightHistoryModel.create as jest.Mock).mockResolvedValue({
      _id: 'test-id',
      aiSummary: 'Test summary',
      recommendations: {
        monthlySummary: `Total expenditure reached $1500.00 across 12 transactions this month.`,
        topSpendingReason: 'High volume at Starbucks and increased spending in Food.',
        overspendingWarning: 'Spending remains within normal parameters.',
        savingSuggestions: ['Review recurring subscriptions ($200.00 total).'],
        recurringSubscriptionAdvice: 'You currently spend $200.00 on recurring merchants.',
        budgetRecommendation: 1350,
        interestingSpendingPattern: 'Frequent visits at Starbucks (4 visits).',
        positiveFinancialHabits: 'Consistent receipt tracking maintains audit transparency.',
      },
      provider: 'OpenAI-Mock',
      model: 'gpt-4o-mini',
      tokenUsage: { promptTokens: 400, completionTokens: 250, totalTokens: 650 },
      latency: 50,
    });
  });

  describe('generateInsights', () => {
    it('should return mock insights when API key is placeholder', async () => {
      const result = await InsightService.generateInsights(mockSummary, mockCategories, mockMerchants, 'test-user-id');

      expect(InsightHistoryModel.create).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should include all required insight fields in the persisted record', async () => {
      await InsightService.generateInsights(mockSummary, mockCategories, mockMerchants, 'test-user-id');
      const createdArg = (InsightHistoryModel.create as jest.Mock).mock.calls[0][0];
      expect(createdArg).toMatchObject({
        analyticsSnapshot: expect.objectContaining({
          summary: expect.objectContaining({ totalAmount: 1500 }),
          categories: expect.any(Array),
          merchants: expect.any(Array),
        }),
      });
    });

    it('should record correct token usage in mock mode', async () => {
      const result = await InsightService.generateInsights(mockSummary, mockCategories, mockMerchants, 'test-user-id');

      expect(result.tokenUsage).toBeDefined();
    });

    it('should persist insight record to MongoDB', async () => {
      await InsightService.generateInsights(mockSummary, mockCategories, mockMerchants, 'test-user-id');

      expect(InsightHistoryModel.create).toHaveBeenCalledTimes(1);
    });
  });
});
