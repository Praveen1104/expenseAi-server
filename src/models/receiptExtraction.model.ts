import mongoose, { Schema, Document } from 'mongoose';

export type ExtractionStatus = 'PROCESSING' | 'EXTRACTED' | 'VALIDATED' | 'FAILED';

export interface FieldWithConfidence<T> {
  value: T;
  confidence: number;
  source?: string;
}

export interface ExtractedLineItem {
  name: FieldWithConfidence<string>;
  quantity: FieldWithConfidence<number>;
  unitPrice: FieldWithConfidence<number>;
  discount?: FieldWithConfidence<number>;
  tax?: FieldWithConfidence<number>;
  total: FieldWithConfidence<number>;
}

export interface ValidatedExtractionData {
  merchant: FieldWithConfidence<string>;
  receiptNumber?: FieldWithConfidence<string>;
  transactionDate: FieldWithConfidence<string>;
  currency: FieldWithConfidence<string>;
  subtotal: FieldWithConfidence<number>;
  tax: FieldWithConfidence<number>;
  discount?: FieldWithConfidence<number>;
  serviceCharge?: FieldWithConfidence<number>;
  grandTotal: FieldWithConfidence<number>;
  paymentMethod?: FieldWithConfidence<string>;
  categorySuggestion?: FieldWithConfidence<string>;
  lineItems: ExtractedLineItem[];
}

export interface IReceiptExtraction extends Document {
  receiptId: mongoose.Types.ObjectId;
  rawAIResponse: Record<string, unknown>;
  validatedData: ValidatedExtractionData;
  processingTime: number; // ms
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  aiModel: string;
  provider: string;
  status: ExtractionStatus;
  confidenceSummary: {
    overallConfidence: number;
    lowConfidenceFields: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptExtractionSchema = new Schema<IReceiptExtraction>(
  {
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: 'Receipt',
      required: true,
      index: true,
    },
    rawAIResponse: {
      type: Schema.Types.Mixed,
      default: {},
    },
    validatedData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    processingTime: {
      type: Number,
      default: 0,
    },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    aiModel: {
      type: String,
      default: 'gpt-4o-mini',
    },
    provider: {
      type: String,
      default: 'OpenAI',
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'EXTRACTED', 'VALIDATED', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    confidenceSummary: {
      overallConfidence: { type: Number, default: 1.0 },
      lowConfidenceFields: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ReceiptExtractionModel = mongoose.model<IReceiptExtraction>(
  'ReceiptExtraction',
  ReceiptExtractionSchema
);
