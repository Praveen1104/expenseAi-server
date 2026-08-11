import mongoose, { Schema, Document } from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, ExpenseCategory, PaymentMethod } from '../constants/expense.constants.js';

export interface ConfidenceScores {
  merchant: number;
  category: number;
  tags: number;
  summary: number;
}

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  merchant: string;
  normalizedMerchant?: string;
  merchantId?: mongoose.Types.ObjectId;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionDate: Date;
  notes?: string;
  aiSummary?: string;
  tags: string[];
  confidenceScores?: ConfidenceScores;
  isRecurring?: boolean;
  recurringFrequency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      index: true,
    },
    merchant: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
      index: true,
    },
    normalizedMerchant: {
      type: String,
      trim: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: EXPENSE_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      index: true,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      default: 'USD',
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      required: [true, 'Payment method is required'],
      index: true,
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    aiSummary: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    confidenceScores: {
      merchant: { type: Number, default: 1.0 },
      category: { type: Number, default: 1.0 },
      tags: { type: Number, default: 1.0 },
      summary: { type: Number, default: 1.0 },
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    recurringFrequency: {
      type: String,
      default: 'None',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for optimized filtering and sorting
ExpenseSchema.index({ category: 1, transactionDate: -1 });
ExpenseSchema.index({ merchant: 1, transactionDate: -1 });
ExpenseSchema.index({ amount: 1, transactionDate: -1 });

// Full text search index
ExpenseSchema.index(
  { title: 'text', merchant: 'text', normalizedMerchant: 'text', notes: 'text', tags: 'text' },
  { weights: { merchant: 10, normalizedMerchant: 8, title: 5, tags: 3, notes: 1 } }
);

export const ExpenseModel = mongoose.model<IExpense>('Expense', ExpenseSchema);
