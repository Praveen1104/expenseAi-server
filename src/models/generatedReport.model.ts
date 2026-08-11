import mongoose, { Schema, Document } from 'mongoose';

export type ReportType =
  | 'Daily Report'
  | 'Weekly Report'
  | 'Monthly Report'
  | 'Quarterly Report'
  | 'Yearly Report'
  | 'Category Report'
  | 'Merchant Report'
  | 'Payment Method Report'
  | 'Budget Report';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';

export interface IReportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  merchant?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  budgetId?: string;
}

export interface IGeneratedReport extends Document {
  userId: mongoose.Types.ObjectId;
  reportType: ReportType;
  filters: IReportFilters;
  generatedAt: Date;
  format: ExportFormat;
  fileLocation: string;
  executionTime: number; // in ms
  downloadCount: number;
  aiSummarySnapshot?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedReportSchema = new Schema<IGeneratedReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    reportType: {
      type: String,
      required: [true, 'Report type is required'],
      index: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    format: {
      type: String,
      enum: ['pdf', 'xlsx', 'csv', 'json'],
      required: [true, 'Export format is required'],
      index: true,
    },
    fileLocation: {
      type: String,
      required: [true, 'File location is required'],
    },
    executionTime: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    aiSummarySnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

GeneratedReportSchema.index({ generatedAt: -1, reportType: 1 });

export const GeneratedReportModel = mongoose.model<IGeneratedReport>(
  'GeneratedReport',
  GeneratedReportSchema
);
