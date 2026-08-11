import { ImageValidator } from './imageValidator.service.js';
import { ImageOptimizer } from './imageOptimizer.service.js';
import { storageService } from './storage.service.js';
import { receiptRepository } from '../repositories/receipt.repository.js';
import { receiptQueueService } from './receiptQueue.service.js';
import { IReceipt, ReceiptStatus } from '../models/receipt.model.js';
import { NotFoundError, ValidationError } from '../utils/apiError.js';
import { logger } from '../lib/logger.js';

export class ReceiptService {
  public async processUpload(file: Express.Multer.File, userId: string): Promise<IReceipt> {
    const uploadStartTime = Date.now();
    logger.info(
      `[ReceiptService] Processing receipt upload: "${file.originalname}" (${Math.round(
        file.size / 1024
      )} KB, Mime: ${file.mimetype}) for user ${userId}`
    );

    // 1. Validate File & Extract Metadata
    const validation = await ImageValidator.validateImage(file.buffer, file.mimetype);

    // 2. Duplicate Upload Check (Hash check for the specific user)
    const existingDuplicate = await receiptRepository.findByHash(validation.fileHash, userId);
    if (existingDuplicate) {
      logger.warn(
        `[ReceiptService] Duplicate receipt uploaded. Existing ID: ${existingDuplicate._id}`
      );
      throw new ValidationError(
        `Duplicate file upload detected. A receipt with identical content already exists (ID: ${existingDuplicate._id}).`
      );
    }

    // 3. Image Optimization (Strip EXIF, Compress WebP, Generate Thumbnail)
    const optimization = await ImageOptimizer.processImage(file.buffer, file.mimetype);

    // 4. Store Files on Disk
    const storageResult = await storageService.saveReceipt(
      optimization.optimizedBuffer,
      optimization.thumbnailBuffer,
      file.originalname,
      optimization.mimeType
    );

    // 5. Create Receipt Document in MongoDB (Status: UPLOADED)
    const receipt = await receiptRepository.create({
      userId: userId as any,
      originalFileName: file.originalname,
      mimeType: optimization.mimeType,
      fileSize: optimization.optimizedBuffer.length,
      fileHash: validation.fileHash,
      imageWidth: optimization.width,
      imageHeight: optimization.height,
      storagePath: storageResult.storagePath,
      thumbnailPath: storageResult.thumbnailPath,
      status: 'UPLOADED',
      uploadedAt: new Date(),
      retryCount: 0,
    });

    logger.info(`[ReceiptService] Receipt document created in DB with ID: ${receipt._id}`);

    // 6. Enqueue BullMQ Processing Job
    try {
      await receiptQueueService.addProcessingJob({
        receiptId: String(receipt._id),
        imageLocation: storageResult.storagePath,
        uploadTimestamp: receipt.uploadedAt.toISOString(),
        retryCount: receipt.retryCount,
      });

      // Update Status to QUEUED
      const queuedReceipt = await receiptRepository.updateStatus(
        String(receipt._id),
        'QUEUED'
      );
      
      const totalTimeMs = Date.now() - uploadStartTime;
      logger.info(
        `[ReceiptService] Receipt pipeline completed successfully in ${totalTimeMs}ms. Status: QUEUED`
      );

      return queuedReceipt || receipt;
    } catch (queueError) {
      logger.error(
        `[ReceiptService] Failed to enqueue job for receipt ${receipt._id}:`,
        queueError
      );
      await receiptRepository.updateStatus(
        String(receipt._id),
        'FAILED',
        'Failed to queue background job'
      );
      throw new ValidationError('Receipt uploaded but failed to enqueue background processing job');
    }
  }

  public async getReceiptById(id: string, userId: string): Promise<IReceipt> {
    const receipt = await receiptRepository.findByIdAndUser(id, userId);
    if (!receipt) {
      throw new NotFoundError(`Receipt with ID "${id}" was not found`);
    }
    return receipt;
  }

  public async getReceipts(page = 1, limit = 10, status?: ReceiptStatus, userId?: string) {
    return receiptRepository.findReceiptsPaginated(page, limit, status, userId);
  }

  public async deleteReceipt(id: string, userId: string): Promise<void> {
    const receipt = await this.getReceiptById(id, userId);
    await storageService.deleteFile(receipt.storagePath);
    await storageService.deleteFile(receipt.thumbnailPath);
    await receiptRepository.deleteByUser(id, userId);
    logger.info(`[ReceiptService] Receipt deleted ID: ${id}`);
  }

  public async retryReceipt(id: string, userId: string): Promise<IReceipt> {
    const receipt = await this.getReceiptById(id, userId);
    const newRetryCount = receipt.retryCount + 1;

    await receiptQueueService.addProcessingJob({
      receiptId: String(receipt._id),
      imageLocation: receipt.storagePath,
      uploadTimestamp: new Date().toISOString(),
      retryCount: newRetryCount,
    });

    const updated = await receiptRepository.updateByUser(id, {
      status: 'QUEUED',
      retryCount: newRetryCount,
      errorMessage: '',
    }, userId);

    logger.info(`[ReceiptService] Receipt retry requested ID: ${id}, Retry count: ${newRetryCount}`);
    return updated || receipt;
  }
}

export const receiptService = new ReceiptService();
