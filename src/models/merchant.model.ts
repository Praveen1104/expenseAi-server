import mongoose, { Schema, Document } from 'mongoose';

export type RecurringFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Subscription' | 'Regular' | 'None';

export interface IMerchant extends Document {
  merchantName: string;
  normalizedName: string;
  merchantType: string;
  categories: string[];
  visitCount: number;
  totalSpend: number;
  averageSpend: number;
  lastVisit: Date;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    merchantName: {
      type: String,
      required: [true, 'Raw merchant name is required'],
      trim: true,
    },
    normalizedName: {
      type: String,
      required: [true, 'Normalized merchant name is required'],
      trim: true,
      unique: true,
      index: true,
    },
    merchantType: {
      type: String,
      default: 'General Store',
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
      index: true,
    },
    visitCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalSpend: {
      type: Number,
      default: 0,
    },
    averageSpend: {
      type: Number,
      default: 0,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Subscription', 'Regular', 'None'],
      default: 'None',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

MerchantSchema.index({ totalSpend: -1 });
MerchantSchema.index({ visitCount: -1 });

export const MerchantModel = mongoose.model<IMerchant>('Merchant', MerchantSchema);
