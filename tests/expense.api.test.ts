import request from 'supertest';
import { createApp } from '../src/app';

describe('Expense API Integration Tests', () => {
  const app = createApp();

  describe('POST /api/v1/expenses validation', () => {
    it('should reject payload with negative amount', async () => {
      const response = await request(app).post('/api/v1/expenses').send({
        title: 'Uber Ride',
        merchant: 'Uber',
        category: 'Transportation',
        amount: -15.0,
        currency: 'USD',
        paymentMethod: 'Credit Card',
        transactionDate: new Date().toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('amount');
    });

    it('should reject payload missing required merchant', async () => {
      const response = await request(app).post('/api/v1/expenses').send({
        title: 'Groceries',
        category: 'Groceries',
        amount: 50.0,
        currency: 'USD',
        paymentMethod: 'Cash',
        transactionDate: new Date().toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('merchant');
    });
  });
});
