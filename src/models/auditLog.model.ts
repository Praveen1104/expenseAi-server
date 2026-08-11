import mongoose, { Schema, Document } from 'mongoose';

export type AuditEntityType = 'Expense' | 'Receipt' | 'Budget' | 'Report' | 'SavingsGoal';
export type AuditAction =
  | 'Expense Created'
  | 'Expense Updated'
  | 'Expense Deleted'
  | 'Receipt Processed'
  | 'Budget Modified'
  | 'Report Generated';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  performedBy: string;
  timestamp: Date;
  ipAddress?: string;
  requestId?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Expense', 'Receipt', 'Budget', 'Report', 'SavingsGoal'],
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    performedBy: {
      type: String,
      required: [true, 'PerformedBy is required'],
      default: 'system',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    requestId: {
      type: String,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ timestamp: -1, entityType: 1 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
