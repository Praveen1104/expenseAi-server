import mongoose, { Schema, Document } from 'mongoose';

export type ReceiptStatus = 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IReceipt extends Document {
  userId: mongoose.Types.ObjectId;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  imageWidth: number;
  imageHeight: number;
  storagePath: string;
  thumbnailPath: string;
  status: ReceiptStatus;
  uploadedAt: Date;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'Mime type is required'],
      enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size cannot be empty'],
    },
    fileHash: {
      type: String,
      required: [true, 'File hash is required'],
      index: true,
    },
    imageWidth: {
      type: Number,
      required: true,
      default: 0,
    },
    imageHeight: {
      type: Number,
      required: true,
      default: 0,
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
    thumbnailPath: {
      type: String,
      required: [true, 'Thumbnail path is required'],
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'UPLOADED',
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ReceiptSchema.index({ createdAt: -1 });
ReceiptSchema.index({ status: 1, createdAt: -1 });

export const ReceiptModel = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
