import { PDFService } from './pdf.service.js';
import { ExcelService } from './excel.service.js';
import { CSVService } from './csv.service.js';

describe('Phase 8 Report & Audit Unit Tests', () => {
  const mockSummary = {
    totalExpenses: 5,
    totalAmount: 450.5,
    averageAmount: 90.1,
    highestAmount: 200,
    lowestAmount: 15,
    recurringAmount: 50,
    monthlyGrowthPercent: 5.2,
    topCategory: 'Food & Dining',
    topMerchant: 'Supermarket',
  };

  const mockCategories = [
    { category: 'Food & Dining', totalAmount: 300, count: 3, percentage: 66.6 },
    { category: 'Utilities', totalAmount: 150.5, count: 2, percentage: 33.4 },
  ];

  const mockMerchants = [
    { merchant: 'Supermarket', totalAmount: 300, visitCount: 3 },
  ];

  const mockExpenses = [
    {
      _id: '650000000000000000000001',
      amount: 100,
      category: 'Food & Dining',
      merchant: 'Supermarket',
      transactionDate: new Date(),
      paymentMethod: 'Credit Card',
      isRecurring: false,
    },
  ] as any;

  describe('CSVService', () => {
    it('should generate valid CSV text containing sections', () => {
      const csv = CSVService.generateCSV(mockExpenses, mockCategories, mockMerchants);
      expect(csv).toContain('=== EXPENSES ===');
      expect(csv).toContain('Supermarket');
      expect(csv).toContain('Food & Dining');
    });
  });

  describe('ExcelService', () => {
    it('should generate a valid XLSX buffer', async () => {
      const buffer = await ExcelService.generateExcel(
        mockSummary,
        mockExpenses,
        mockCategories,
        mockMerchants,
        []
      );
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  describe('PDFService', () => {
    it('should generate a valid PDF buffer', async () => {
      const buffer = await PDFService.generatePDF(
        'Monthly Report',
        mockSummary,
        mockExpenses,
        mockCategories,
        mockMerchants,
        []
      );
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
    });
  });
});
