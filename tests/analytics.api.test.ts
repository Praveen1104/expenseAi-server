import request from 'supertest';
import { createApp } from '../src/app';
import { analyticsService } from '../src/services/analytics/analytics.service';

jest.mock('../src/services/analytics/analytics.service');

describe('Analytics API Integration Tests', () => {
  const app = createApp();

  describe('GET /api/v1/analytics/summary', () => {
    it('should return summary metrics payload', async () => {
      (analyticsService.getSummary as jest.Mock).mockResolvedValue({
        totalExpenses: 10,
        totalAmount: 1200,
        averageAmount: 120,
        highestAmount: 500,
        lowestAmount: 15,
        recurringAmount: 150,
        monthlyGrowthPercent: 12.5,
        topCategory: 'Food',
        topMerchant: 'Amazon',
      });

      const response = await request(app).get('/api/v1/analytics/summary?range=month');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBe(1200);
    });
  });

  describe('POST /api/v1/analytics/insights', () => {
    it('should trigger AI insights generation', async () => {
      (analyticsService.generateInsights as jest.Mock).mockResolvedValue({
        _id: '123',
        aiSummary: 'Spending is healthy',
        recommendations: {
          monthlySummary: 'Spending is healthy',
          topSpendingReason: 'Food',
          overspendingWarning: 'None',
          savingSuggestions: ['Save coffee money'],
          recurringSubscriptionAdvice: 'Audit Netflix',
          budgetRecommendation: 1000,
          interestingSpendingPattern: 'Weekend coffee',
          positiveFinancialHabits: 'Consistent tracking',
        },
      });

      const response = await request(app).post('/api/v1/analytics/insights').send({ range: 'month' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.aiSummary).toBe('Spending is healthy');
    });
  });
});
