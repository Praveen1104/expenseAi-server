import request from 'supertest';
import { createApp } from '../src/app';


describe('SmartSpend AI Backend API Base Endpoints', () => {
  const app = createApp();

  describe('GET /', () => {
    it('should return 200 OK with API information payload', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('SmartSpend AI API');
      expect(response.body.data.version).toBe('1.0.0');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status endpoint response', async () => {
      const response = await request(app).get('/api/v1/health');
      expect([200, 533]).toContain(response.status);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
    });
  });

  describe('GET /non-existent-route', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
