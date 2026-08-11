import { Request, Response } from 'express';
import { ReportService } from '../services/report/report.service.js';
import { AuditService } from '../services/report/audit.service.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { UnauthorizedError } from '../utils/apiError.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { logger } from '../lib/logger.js';

export class ReportController {
  /**
   * POST /api/v1/reports/generate
   */
  public static async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new UnauthorizedError('User authentication details missing');
      }

      const { reportType, format, filters } = req.body;

      if (!reportType || !format) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Missing required parameters: reportType and format.',
        });
        return;
      }

      const result = await ReportService.generateReport({
        reportType,
        format,
        filters,
      }, authReq.user.userId);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('X-Report-ID', String(result.reportRecord._id));

      res.status(STATUS_CODES.OK).send(result.fileBuffer);
    } catch (error) {
      logger.error('[ReportController] Report generation failed:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/v1/reports/history
   */
  public static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new UnauthorizedError('User authentication details missing');
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const history = await ReportService.getHistory(page, limit, authReq.user.userId);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: history.reports,
        total: history.total,
        page: history.page,
        limit: history.limit,
      });
    } catch (error) {
      logger.error('[ReportController] Failed to fetch report history:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch report history',
      });
    }
  }

  /**
   * GET /api/v1/reports/download/:id
   */
  public static async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new UnauthorizedError('User authentication details missing');
      }

      const { id } = req.params;
      const result = await ReportService.getReportFile(id, authReq.user.userId);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);

      res.status(STATUS_CODES.OK).send(result.fileBuffer);
    } catch (error) {
      logger.error('[ReportController] Report download failed:', error);
      res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: error instanceof Error ? error.message : 'Report file not found',
      });
    }
  }

  /**
   * GET /api/v1/audit
   */
  public static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new UnauthorizedError('User authentication details missing');
      }

      const { entityType, action, startDate, endDate, page, limit } = req.query;

      const logs = await AuditService.getAuditLogs({
        entityType: entityType as string,
        action: action as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      }, authReq.user.userId);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: logs.logs,
        total: logs.total,
        page: logs.page,
        limit: logs.limit,
      });
    } catch (error) {
      logger.error('[ReportController] Failed to fetch audit logs:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  }
}
