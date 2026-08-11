import { ocrExtractionSchema, ReceiptExtractionPayload } from '../../validators/ocr.validator.js';
import { ValidationError } from '../../utils/apiError.js';
import { logger } from '../logger.js';

export interface SchemaValidationResult {
  validatedPayload: ReceiptExtractionPayload;
  confidenceSummary: {
    overallConfidence: number;
    lowConfidenceFields: string[];
  };
}

const CONFIDENCE_THRESHOLD = 0.85;

export class SchemaValidator {
  public static validate(rawJson: Record<string, unknown>): SchemaValidationResult {
    const parseResult = ocrExtractionSchema.safeParse(rawJson);

    if (!parseResult.success) {
      logger.error('[SchemaValidator] Vision output schema validation failed:', parseResult.error.flatten().fieldErrors);
      throw new ValidationError(
        'AI Vision raw output failed schema constraints validation',
      );
    }
    const payload = parseResult.data;

    if ('isReceipt' in payload && payload.isReceipt === false) {
      throw new ValidationError(payload.error || 'This document does not appear to be a financial receipt');
    }

    const receiptPayload = payload as ReceiptExtractionPayload;
    const confidenceScores: { field: string; score: number }[] = [];

    // Evaluate root level fields
    if (receiptPayload.merchant) confidenceScores.push({ field: 'merchant', score: receiptPayload.merchant.confidence });
    if (receiptPayload.transactionDate) confidenceScores.push({ field: 'transactionDate', score: receiptPayload.transactionDate.confidence });
    if (receiptPayload.currency) confidenceScores.push({ field: 'currency', score: receiptPayload.currency.confidence });
    if (receiptPayload.subtotal) confidenceScores.push({ field: 'subtotal', score: receiptPayload.subtotal.confidence });
    if (receiptPayload.tax) confidenceScores.push({ field: 'tax', score: receiptPayload.tax.confidence });
    if (receiptPayload.grandTotal) confidenceScores.push({ field: 'grandTotal', score: receiptPayload.grandTotal.confidence });

    // Evaluate line items
    if (receiptPayload.lineItems) {
      receiptPayload.lineItems.forEach((item, index) => {
        confidenceScores.push({ field: `lineItems[${index}].name`, score: item.name.confidence });
        confidenceScores.push({ field: `lineItems[${index}].total`, score: item.total.confidence });
      });
    }

    const lowConfidenceFields = confidenceScores
      .filter((c) => c.score < CONFIDENCE_THRESHOLD)
      .map((c) => c.field);

    const totalScore = confidenceScores.reduce((sum, c) => sum + c.score, 0);
    const overallConfidence = confidenceScores.length > 0 ? totalScore / confidenceScores.length : 1.0;

    logger.info(
      `[SchemaValidator] Validated extraction payload. Overall Confidence: ${(overallConfidence * 100).toFixed(1)}%. Low confidence count: ${lowConfidenceFields.length}`
    );

    return {
      validatedPayload: receiptPayload,
      confidenceSummary: {
        overallConfidence: Math.round(overallConfidence * 100) / 100,
        lowConfidenceFields,
      },
    };
  }
}
