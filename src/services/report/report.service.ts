import fs from 'fs';
import path from 'path';
import { FilterQuery } from 'mongoose';
import { ExpenseModel, IExpense } from '../../models/expense.model.js';
import { GeneratedReportModel, IGeneratedReport, ReportType, ExportFormat, IReportFilters } from '../../models/generatedReport.model.js';
import { AggregationService } from '../analytics/aggregation.service.js';
import { BudgetService } from '../budget/budget.service.js';
import { ForecastService } from '../budget/forecast.service.js';
import { PDFService } from './pdf.service.js';
import { ExcelService } from './excel.service.js';
import { CSVService } from './csv.service.js';
import { SummaryService } from './summary.service.js';
import { AuditService } from './audit.service.js';
import { redisConfig } from '../../config/redis.config.js';
import { logger } from '../../lib/logger.js';

const REPORT_CACHE_TTL = 60 * 60; // 1 hour

export interface GenerateReportPayload {
  reportType: ReportType;
  format: ExportFormat;
  filters?: IReportFilters;
}

export class ReportService {
  /**
   * Main Report Generator Pipeline:
   * Expenses -> Query & Match -> Aggregation -> Format Generator (PDF/Excel/CSV/JSON) -> Audit Log -> Return File
   */
  public static async generateReport(payload: GenerateReportPayload, userId: string): Promise<{
    reportRecord: IGeneratedReport;
    fileBuffer: Buffer;
    contentType: string;
    fileName: string;
  }> {
    const startTime = Date.now();
    const { reportType, format, filters = {} } = payload;

    // Cache check (user-isolated)
    const cacheKey = `report:${userId}:${reportType}:${format}:${JSON.stringify(filters)}`;
    const redis = redisConfig.getClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`[ReportService] Cache hit for report: ${cacheKey}`);
        const parsed = JSON.parse(cached);
        if (fs.existsSync(parsed.fileLocation)) {
          const fileBuffer = fs.readFileSync(parsed.fileLocation);
          const record = await GeneratedReportModel.findOne({ _id: parsed._id, userId });
          if (record) {
            return {
              reportRecord: record,
              fileBuffer,
              contentType: this.getContentType(format),
              fileName: path.basename(parsed.fileLocation),
            };
          }
        }
      }
    } catch {
      // Redis fallback
    }

    // 1. Build MongoDB filter query based on reportType and custom filters
    const query = this.buildFilterQuery(reportType, filters, userId);

    // 2. Fetch dataset
    const expenses = await ExpenseModel.find(query).sort({ transactionDate: -1 });

    // 3. Compute Deterministic Analytics Aggregations
    const now = new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : now;

    const [summaryStats, categories, merchants, budgets, forecast] = await Promise.all([
      AggregationService.getSummaryStats('custom', userId, startDate, endDate),
      AggregationService.getCategoryBreakdown('custom', userId, startDate, endDate),
      AggregationService.getMerchantLeaderboard('custom', 5, userId, startDate, endDate),
      BudgetService.getAllBudgetsWithUsage(userId),
      ForecastService.generateForecast(userId),
    ]);

    // 4. Generate AI Executive Summary (Strictly receives pre-computed deterministic figures)
    const aiSummary = await SummaryService.generateSummary(
      summaryStats,
      categories,
      merchants,
      forecast,
      budgets
    );

    // 5. Generate requested Export Format
    let fileBuffer: Buffer;
    let fileExtension = format;

    if (format === 'pdf') {
      fileBuffer = await PDFService.generatePDF(
        reportType,
        summaryStats,
        expenses,
        categories,
        merchants,
        budgets,
        aiSummary
      );
    } else if (format === 'xlsx') {
      fileBuffer = await ExcelService.generateExcel(
        summaryStats,
        expenses,
        categories,
        merchants,
        budgets,
        forecast
      );
    } else if (format === 'csv') {
      const csvStr = CSVService.generateCSV(expenses, categories, merchants);
      fileBuffer = Buffer.from(csvStr, 'utf-8');
    } else if (format === 'json') {
      const jsonObj = {
        reportType,
        generatedAt: new Date().toISOString(),
        filters,
        summaryStats,
        aiSummary,
        categories,
        merchants,
        budgets,
        forecast,
        expenses,
      };
      fileBuffer = Buffer.from(JSON.stringify(jsonObj, null, 2), 'utf-8');
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    const executionTime = Date.now() - startTime;

    // 6. Save to disk storage
    const storageDir = path.resolve(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `report_${Date.now()}.${fileExtension}`;
    const fileLocation = path.join(storageDir, fileName);
    fs.writeFileSync(fileLocation, fileBuffer);

    // 7. Persist GeneratedReport record in DB
    const reportRecord = await GeneratedReportModel.create({
      userId: userId as any,
      reportType,
      filters,
      generatedAt: new Date(),
      format,
      fileLocation,
      executionTime,
      aiSummarySnapshot: aiSummary as unknown as Record<string, unknown>,
    });

    // 8. Record Audit Event
    await AuditService.log({
      entityType: 'Report',
      entityId: String(reportRecord._id),
      action: 'Report Generated',
      newValue: { reportType, format, executionTime, fileName },
      userId: String(reportRecord.userId),
    });

    // Cache record in Redis (1 hour)
    try {
      await redis.setex(
        cacheKey,
        REPORT_CACHE_TTL,
        JSON.stringify({ _id: reportRecord._id, fileLocation })
      );
    } catch {
      // Redis fallback
    }

    logger.info(
      `[ReportService] Successfully generated ${reportType} (${format}) in ${executionTime}ms for user ${userId}`
    );

    return {
      reportRecord,
      fileBuffer,
      contentType: this.getContentType(format),
      fileName,
    };
  }

  /**
   * Fetch Report History with pagination.
   */
  public static async getHistory(page = 1, limit = 20, userId?: string): Promise<{
    reports: IGeneratedReport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: FilterQuery<IGeneratedReport> = {};
    if (userId) {
      filter.userId = userId as any;
    }

    const [reports, total] = await Promise.all([
      GeneratedReportModel.find(filter)
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      GeneratedReportModel.countDocuments(filter),
    ]);

    return { reports, total, page, limit };
  }

  /**
   * Download a previously generated report file and increment download count.
   */
  public static async getReportFile(id: string, userId: string): Promise<{
    fileBuffer: Buffer;
    contentType: string;
    fileName: string;
  }> {
    const record = await GeneratedReportModel.findOne({ _id: id, userId });
    if (!record || !fs.existsSync(record.fileLocation)) {
      throw new Error('Report file not found or has expired.');
    }

    record.downloadCount += 1;
    await record.save();

    const fileBuffer = fs.readFileSync(record.fileLocation);
    const fileName = path.basename(record.fileLocation);

    return {
      fileBuffer,
      contentType: this.getContentType(record.format),
      fileName,
    };
  }

  /**
   * Helper: Build Mongoose filter query from ReportType
   */
  private static buildFilterQuery(
    reportType: ReportType,
    filters: IReportFilters,
    userId: string
  ): FilterQuery<IExpense> {
    const query: FilterQuery<IExpense> = { userId: userId as any };
    const now = new Date();

    if (filters.startDate || filters.endDate) {
      query.transactionDate = {};
      if (filters.startDate) query.transactionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.transactionDate.$lte = new Date(filters.endDate);
    } else {
      if (reportType === 'Daily Report') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.transactionDate = { $gte: start, $lte: now };
      } else if (reportType === 'Weekly Report') {
        const day = now.getDay();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        query.transactionDate = { $gte: start, $lte: now };
      } else if (reportType === 'Monthly Report') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        query.transactionDate = { $gte: start, $lte: now };
      } else if (reportType === 'Quarterly Report') {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterMonth, 1);
        query.transactionDate = { $gte: start, $lte: now };
      } else if (reportType === 'Yearly Report') {
        const start = new Date(now.getFullYear(), 0, 1);
        query.transactionDate = { $gte: start, $lte: now };
      }
    }

    if (filters.category) query.category = filters.category;
    if (filters.merchant) query.merchant = new RegExp(filters.merchant, 'i');
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
    }

    return query;
  }

  private static getContentType(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}
