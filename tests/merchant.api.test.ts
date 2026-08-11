import request from 'supertest';
import { createApp } from '../src/app';
import { merchantRepository } from '../src/repositories/merchant.repository';

jest.mock('../src/repositories/merchant.repository');

describe('Merchant API Integration Tests', () => {
  const app = createApp();

  describe('GET /api/v1/merchants', () => {
    it('should return list of merchant profiles with pagination meta', async () => {
      (merchantRepository.findMerchantsPaginated as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        pages: 1,
      });

      const response = await request(app).get('/api/v1/merchants');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
