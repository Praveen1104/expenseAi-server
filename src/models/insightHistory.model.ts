import mongoose, { Schema, Document } from 'mongoose';

export interface AIInsightsData {
  monthlySummary: string;
  topSpendingReason: string;
  overspendingWarning: string;
  savingSuggestions: string[];
  recurringSubscriptionAdvice: string;
  budgetRecommendation: number;
  interestingSpendingPattern: string;
  positiveFinancialHabits: string;
}

export interface IInsightHistory extends Document {
  userId: mongoose.Types.ObjectId;
  analyticsSnapshot: Record<string, unknown>;
  aiSummary: string;
  recommendations: AIInsightsData;
  provider: string;
  modelName: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
  createdAt: Date;
}

const InsightHistorySchema = new Schema<IInsightHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    analyticsSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    aiSummary: {
      type: String,
      required: true,
    },
    recommendations: {
      type: Schema.Types.Mixed,
      required: true,
    },
    provider: {
      type: String,
      default: 'OpenAI',
    },
    modelName: {
      type: String,
      default: 'gpt-4o-mini',
    },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    latency: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

InsightHistorySchema.index({ createdAt: -1 });

export const InsightHistoryModel = mongoose.model<IInsightHistory>(
  'InsightHistory',
  InsightHistorySchema
);
