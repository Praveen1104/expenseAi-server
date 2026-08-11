import request from 'supertest';
import { createApp } from '../src/app';
import { receiptRepository } from '../src/repositories/receipt.repository';

jest.mock('../src/repositories/receipt.repository');

describe('Receipt API Integration Tests', () => {
  const app = createApp();

  describe('POST /api/v1/receipts/upload without file', () => {
    it('should return 400 validation error if no file attached', async () => {
      const response = await request(app).post('/api/v1/receipts/upload');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/receipts', () => {
    it('should return list of receipts with pagination envelope', async () => {
      (receiptRepository.findReceiptsPaginated as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        pages: 1,
      });

      const response = await request(app).get('/api/v1/receipts');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
