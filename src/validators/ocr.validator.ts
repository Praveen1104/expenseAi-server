import { z } from 'zod';

const fieldWithConfidence = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: z.number().min(0).max(1).default(0.95),
    source: z.string().optional().default('AI Vision OCR'),
  });

export const extractedLineItemSchema = z.object({
  name: fieldWithConfidence(z.string().min(1)),
  quantity: fieldWithConfidence(z.number().positive().default(1)),
  unitPrice: fieldWithConfidence(z.number().min(0).default(0)),
  discount: fieldWithConfidence(z.number().min(0)).optional(),
  tax: fieldWithConfidence(z.number().min(0)).optional(),
  total: fieldWithConfidence(z.number().min(0).default(0)),
});

export const extractedReceiptSchema = z.object({
  isReceipt: z.literal(true).optional(),
  merchant: fieldWithConfidence(z.string().min(1)),
  receiptNumber: fieldWithConfidence(z.string()).optional(),
  transactionDate: fieldWithConfidence(z.string().min(1)),
  currency: fieldWithConfidence(z.string().length(3).default('USD')),
  subtotal: fieldWithConfidence(z.number().min(0).default(0)),
  tax: fieldWithConfidence(z.number().min(0).default(0)),
  discount: fieldWithConfidence(z.number().min(0)).optional(),
  serviceCharge: fieldWithConfidence(z.number().min(0)).optional(),
  grandTotal: fieldWithConfidence(z.number().positive()),
  paymentMethod: fieldWithConfidence(z.string()).optional(),
  categorySuggestion: fieldWithConfidence(z.string()).optional(),
  lineItems: z.array(extractedLineItemSchema).default([]),
});

export const ocrExtractionSchema = z.union([
  z.object({
    isReceipt: z.literal(false),
    error: z.string(),
  }),
  extractedReceiptSchema,
]);

export type OCRExtractionPayload = z.infer<typeof ocrExtractionSchema>;
export type ReceiptExtractionPayload = z.infer<typeof extractedReceiptSchema>;
