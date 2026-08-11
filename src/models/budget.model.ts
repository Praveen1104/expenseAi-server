import mongoose, { Schema, Document } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../constants/expense.constants.js';

export type BudgetPeriod = 'monthly' | 'weekly';

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  category: ExpenseCategory | 'Overall';
  monthlyLimit: number;
  warningThreshold: number; // percentage 0-100 (default 80)
  currency: string;
  period: BudgetPeriod;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Budget name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: [...EXPENSE_CATEGORIES, 'Overall'],
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
      index: true,
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly limit is required'],
      min: [0.01, 'Monthly limit must be greater than zero'],
    },
    warningThreshold: {
      type: Number,
      default: 80,
      min: [1, 'Warning threshold must be at least 1%'],
      max: [100, 'Warning threshold cannot exceed 100%'],
    },
    currency: {
      type: String,
      uppercase: true,
      default: 'USD',
    },
    period: {
      type: String,
      enum: ['monthly', 'weekly'],
      default: 'monthly',
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BudgetSchema.index({ category: 1, enabled: 1 });

export const BudgetModel = mongoose.model<IBudget>('Budget', BudgetSchema);
