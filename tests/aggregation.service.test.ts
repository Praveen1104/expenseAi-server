import { AggregationService } from '../src/services/analytics/aggregation.service';
import { ExpenseModel } from '../src/models/expense.model';

jest.mock('../src/models/expense.model');

describe('AggregationService Unit Tests', () => {
  describe('getSummaryStats', () => {
    it('should compute summary metrics using aggregation pipelines', async () => {
      (ExpenseModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          {
            totalExpenses: 5,
            totalAmount: 500,
            averageAmount: 100,
            highestAmount: 250,
            lowestAmount: 20,
          },
        ])
        .mockResolvedValueOnce([{ totalAmount: 100 }]) // recurring
        .mockResolvedValueOnce([{ _id: 'Food', total: 300 }]) // top category
        .mockResolvedValueOnce([{ _id: 'Starbucks', total: 200 }]) // top merchant
        .mockResolvedValueOnce([{ totalAmount: 400 }]); // previous period stats

      const result = await AggregationService.getSummaryStats('month', 'test-user-id');

      expect(result.totalExpenses).toBe(5);
      expect(result.totalAmount).toBe(500);
      expect(result.averageAmount).toBe(100);
      expect(result.topCategory).toBe('Food');
      expect(result.topMerchant).toBe('Starbucks');
      expect(result.monthlyGrowthPercent).toBe(25);
    });
  });
});
