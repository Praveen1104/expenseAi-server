import request from 'supertest';
import { createApp } from '../src/app';
import { visionService } from '../src/services/vision.service';
import { receiptService } from '../src/services/receipt.service';

jest.mock('../src/services/vision.service');
jest.mock('../src/services/receipt.service');

describe('OCR API Integration Tests', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    (receiptService.getReceiptById as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439022',
      userId: '507f1f77bcf86cd799439011',
      status: 'UPLOADED',
    });
  });

  describe('POST /api/v1/receipts/:id/process', () => {
    it('should trigger OCR processing and return extraction payload', async () => {
      const mockExtraction = {
        _id: '507f1f77bcf86cd799439011',
        receiptId: '507f1f77bcf86cd799439022',
        status: 'VALIDATED',
        aiModel: 'gpt-4o-mini',
        provider: 'OpenAI',
        tokenUsage: { promptTokens: 300, completionTokens: 150, totalTokens: 450 },
        confidenceSummary: { overallConfidence: 0.95, lowConfidenceFields: [] },
      };

      (visionService.processReceiptOCR as jest.Mock).mockResolvedValue(mockExtraction);

      const response = await request(app).post('/api/v1/receipts/507f1f77bcf86cd799439022/process');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('GET /api/v1/receipts/:id/extraction', () => {
    it('should return extraction data for receipt', async () => {
      const mockExtraction = {
        _id: '507f1f77bcf86cd799439011',
        receiptId: '507f1f77bcf86cd799439022',
        status: 'VALIDATED',
      };

      (visionService.getExtractionByReceiptId as jest.Mock).mockResolvedValue(mockExtraction);

      const response = await request(app).get('/api/v1/receipts/507f1f77bcf86cd799439022/extraction');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VALIDATED');
    });
  });
});
