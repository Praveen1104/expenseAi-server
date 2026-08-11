import fs from 'fs/promises';
import path from 'path';
import { OpenAIVisionProvider } from '../lib/vision/openAIVisionProvider.js';
import { SchemaValidator } from '../lib/vision/schemaValidator.js';
import { ExtractionMapper } from '../lib/vision/extractionMapper.js';
import { receiptRepository } from '../repositories/receipt.repository.js';
import { ReceiptExtractionModel, IReceiptExtraction, ValidatedExtractionData } from '../models/receiptExtraction.model.js';
import { expenseService } from './expense.service.js';
import { NotFoundError, ValidationError } from '../utils/apiError.js';
import { logger } from '../lib/logger.js';

export class VisionService {
  private visionProvider: OpenAIVisionProvider;

  constructor() {
    this.visionProvider = new OpenAIVisionProvider();
  }

  public async processReceiptOCR(receiptId: string): Promise<IReceiptExtraction> {
    const startTime = Date.now();
    logger.info(`[VisionService] Starting AI Vision OCR processing for Receipt ID: ${receiptId}`);

    // 1. Fetch Receipt entity
    const receipt = await receiptRepository.findById(receiptId);
    if (!receipt) {
      throw new NotFoundError(`Receipt with ID "${receiptId}" not found for OCR processing`);
    }

    const fileNameLower = receipt.originalFileName.toLowerCase();
    if (
      fileNameLower.includes('resume') ||
      fileNameLower.includes('cv') ||
      fileNameLower.includes('curriculum') ||
      fileNameLower.includes('portfolio') ||
      fileNameLower.includes('cover')
    ) {
      await receiptRepository.updateStatus(receiptId, 'FAILED', 'Uploaded document is a resume/CV, not a receipt.');
      throw new ValidationError('This document does not appear to be a financial receipt. Resumes/CVs are rejected.');
    }

    // Update status on receipt to PROCESSING
    await receiptRepository.updateStatus(receiptId, 'PROCESSING');

    try {
      // 2. Read optimized image file buffer from disk
      const fullStoragePath = path.join(process.cwd(), receipt.storagePath.replace(/^\//, ''));
      const imageBuffer = await fs.readFile(fullStoragePath);

      // 3. Extract raw data via Vision Provider
      const visionResponse = await this.visionProvider.extractReceiptData(
        imageBuffer,
        receipt.mimeType,
        receipt.originalFileName
      );

      // 4. Validate output schema and compute confidence scores
      const validation = SchemaValidator.validate(visionResponse.rawJson);

      // 5. Create ReceiptExtraction Document in MongoDB
      const extraction = await ReceiptExtractionModel.create({
        receiptId: receipt._id,
        rawAIResponse: visionResponse.rawJson,
        validatedData: validation.validatedPayload as unknown as ValidatedExtractionData,
        processingTime: visionResponse.processingTimeMs,
        tokenUsage: visionResponse.tokenUsage,
        aiModel: visionResponse.model,
        provider: visionResponse.provider,
        status: 'VALIDATED',
        confidenceSummary: validation.confidenceSummary,
      });

      // 6. Map validated extraction into Expense Service & save to MongoDB
      const expenseInput = ExtractionMapper.toExpenseInput(
        validation.validatedPayload,
        receipt.originalFileName
      );

      const createdExpense = await expenseService.createExpense({
        ...expenseInput,
        userId: String(receipt.userId),
      });
      logger.info(
        `[VisionService] Auto-created Expense ID: ${createdExpense._id} from Receipt ID: ${receiptId}`
      );

      // 7. Update Receipt status to COMPLETED
      await receiptRepository.updateStatus(receiptId, 'COMPLETED');

      const totalTimeMs = Date.now() - startTime;
      logger.info(
        `[VisionService] AI Vision OCR completed successfully for Receipt ID: ${receiptId} in ${totalTimeMs}ms`
      );

      return extraction;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'AI Vision OCR extraction failed';
      logger.error(`[VisionService] OCR processing failed for Receipt ID: ${receiptId}:`, error);

      await receiptRepository.updateStatus(receiptId, 'FAILED', errorMsg);

      await ReceiptExtractionModel.create({
        receiptId: receipt._id,
        rawAIResponse: {},
        validatedData: {} as ValidatedExtractionData,
        processingTime: Date.now() - startTime,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        aiModel: 'gpt-4o-mini',
        provider: 'OpenAI',
        status: 'FAILED',
        confidenceSummary: { overallConfidence: 0, lowConfidenceFields: [] },
      });

      throw error;
    }
  }

  public async getExtractionByReceiptId(receiptId: string, userId: string): Promise<IReceiptExtraction> {
    // Verify receipt ownership first
    const receipt = await receiptRepository.findByIdAndUser(receiptId, userId);
    if (!receipt) {
      throw new NotFoundError(`Receipt with ID "${receiptId}" was not found`);
    }

    const extraction = await ReceiptExtractionModel.findOne({ receiptId }).sort({ createdAt: -1 }).exec();
    if (!extraction) {
      throw new NotFoundError(`No OCR extraction record found for Receipt ID "${receiptId}"`);
    }
    return extraction;
  }
}

export const visionService = new VisionService();
