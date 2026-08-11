import { SchemaValidator } from '../src/lib/vision/schemaValidator';
import { PromptBuilder } from '../src/lib/vision/promptBuilder';
import { ExtractionMapper } from '../src/lib/vision/extractionMapper';

describe('AI Vision OCR Components Unit Tests', () => {
  describe('PromptBuilder', () => {
    it('should generate valid non-empty system prompt', () => {
      const prompt = PromptBuilder.getSystemPrompt();
      expect(prompt).toContain('AI Receipt Auditor');
      expect(prompt).toContain('confidence');
    });
  });

  describe('SchemaValidator', () => {
    it('should validate valid raw AI response payload and flag low confidence fields', () => {
      const mockRawJson = {
        merchant: { value: 'Target Store', confidence: 0.95, source: 'Header' },
        receiptNumber: { value: '12345', confidence: 0.70, source: 'Body' }, // Low confidence < 0.85
        transactionDate: { value: '2026-08-01', confidence: 0.90, source: 'Footer' },
        currency: { value: 'USD', confidence: 0.99, source: 'Symbol' },
        subtotal: { value: 100, confidence: 0.95, source: 'Subtotal' },
        tax: { value: 10, confidence: 0.95, source: 'Tax' },
        grandTotal: { value: 110, confidence: 0.98, source: 'Total' },
        paymentMethod: { value: 'Credit Card', confidence: 0.90, source: 'Card' },
        lineItems: [
          {
            name: { value: 'Shirt', confidence: 0.80, source: 'Item 1' }, // Low confidence < 0.85
            quantity: { value: 1, confidence: 0.99, source: 'Qty 1' },
            unitPrice: { value: 100, confidence: 0.95, source: 'Price 1' },
            total: { value: 100, confidence: 0.95, source: 'Total 1' },
          },
        ],
      };

      const result = SchemaValidator.validate(mockRawJson);
      expect(result.validatedPayload.merchant.value).toBe('Target Store');
      expect(result.confidenceSummary.lowConfidenceFields).toContain('lineItems[0].name');
      expect(result.confidenceSummary.overallConfidence).toBeGreaterThan(0.8);
    });

    it('should throw ValidationError on non-receipt response payload', () => {
      const mockNonReceipt = {
        isReceipt: false,
        error: 'This document does not appear to be a financial receipt. Please upload a receipt.',
      };

      expect(() => SchemaValidator.validate(mockNonReceipt)).toThrow();
    });
  });

  describe('ExtractionMapper', () => {
    it('should map validated OCR payload into CreateExpenseInput format', () => {
      const mockValidatedPayload = {
        merchant: { value: 'Apple Store', confidence: 0.99, source: 'Header' },
        transactionDate: { value: '2026-08-05', confidence: 0.95, source: 'Footer' },
        currency: { value: 'USD', confidence: 0.99, source: 'Symbol' },
        subtotal: { value: 1000, confidence: 0.95, source: 'Subtotal' },
        tax: { value: 80, confidence: 0.95, source: 'Tax' },
        grandTotal: { value: 1080, confidence: 0.99, source: 'Total' },
        categorySuggestion: { value: 'Shopping', confidence: 0.90, source: 'AI' },
        paymentMethod: { value: 'Credit Card', confidence: 0.95, source: 'Card' },
        lineItems: [
          {
            name: { value: 'iPad Pro', confidence: 0.95, source: 'Item 1' },
            quantity: { value: 1, confidence: 0.99, source: 'Qty' },
            unitPrice: { value: 1000, confidence: 0.95, source: 'Price' },
            total: { value: 1000, confidence: 0.95, source: 'Total' },
          },
        ],
      };

      const mappedExpense = ExtractionMapper.toExpenseInput(mockValidatedPayload, 'apple-receipt.pdf');
      expect(mappedExpense.merchant).toBe('Apple Store');
      expect(mappedExpense.amount).toBe(1080);
      expect(mappedExpense.category).toBe('Shopping');
      expect(mappedExpense.tags).toContain('ai-scanned');
    });
  });
});
