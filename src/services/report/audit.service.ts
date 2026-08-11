import { AuditLogModel, IAuditLog, AuditEntityType, AuditAction } from '../../models/auditLog.model.js';
import { logger } from '../../lib/logger.js';

export interface LogAuditParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  performedBy?: string;
  ipAddress?: string;
  requestId?: string;
  userId?: string;
}

export class AuditService {
  /**
   * Record a system audit event in MongoDB.
   */
  public static async log(params: LogAuditParams): Promise<IAuditLog> {
    try {
      const entry = await AuditLogModel.create({
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        performedBy: params.performedBy || 'system',
        ipAddress: params.ipAddress || '127.0.0.1',
        requestId: params.requestId || '',
        userId: params.userId || null,
        timestamp: new Date(),
      });

      logger.info(
        `[AuditService] Audit logged: ${params.action} on ${params.entityType}:${params.entityId}`
      );
      return entry;
    } catch (error) {
      logger.error('[AuditService] Failed to record audit log:', error);
      throw error;
    }
  }

  /**
   * Query audit logs with pagination and filters.
   */
  public static async getAuditLogs(
    query: {
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      page?: number;
    },
    userId: string
  ): Promise<{ logs: IAuditLog[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const filter: Record<string, unknown> = { userId: userId as any };

    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) (filter.timestamp as Record<string, unknown>).$gte = new Date(query.startDate);
      if (query.endDate) (filter.timestamp as Record<string, unknown>).$lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLogModel.countDocuments(filter),
    ]);

    return { logs, total, page, limit };
  }
}
