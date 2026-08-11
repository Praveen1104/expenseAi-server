import { Worker, Job } from 'bullmq';
import { RECEIPT_QUEUE_NAME } from '../queues/receipt.queue.js';
import { redisConfig } from '../config/redis.config.js';
import { visionService } from '../services/vision.service.js';
import { logger } from '../lib/logger.js';

export interface ReceiptJobData {
  receiptId: string;
  imageLocation: string;
  uploadTimestamp: string;
  retryCount: number;
}

export const initWorkers = (): Worker | null => {
  try {
    const worker = new Worker<ReceiptJobData>(
      RECEIPT_QUEUE_NAME,
      async (job: Job<ReceiptJobData>) => {
        logger.info(
          `[BullMQ OCRWorker] Processing job ${job.id} for Receipt ID: ${job.data.receiptId} (Retry: ${job.data.retryCount})`
        );
        const extraction = await visionService.processReceiptOCR(job.data.receiptId);
        return {
          processed: true,
          extractionId: extraction._id,
          receiptId: job.data.receiptId,
        };
      },
      {
        connection: redisConfig.getClient(),
        concurrency: 2, // Limit concurrent AI processing workers to prevent rate limits
      }
    );

    worker.on('completed', (job) => {
      logger.info(`[BullMQ OCRWorker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[BullMQ OCRWorker] Job ${job?.id} failed with error: ${err.message}`);
    });

    return worker;
  } catch (error) {
    logger.error('Failed to initialize BullMQ OCRWorker:', error);
    return null;
  }
};
