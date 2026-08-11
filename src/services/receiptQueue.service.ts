import { receiptQueue } from '../queues/receipt.queue.js';
import { logger } from '../lib/logger.js';

export interface ReceiptJobPayload {
  receiptId: string;
  imageLocation: string;
  uploadTimestamp: string;
  retryCount: number;
}

export class ReceiptQueueService {
  public async addProcessingJob(payload: ReceiptJobPayload): Promise<void> {
    try {
      const job = await receiptQueue.add('process-receipt', payload, {
        jobId: `receipt-${payload.receiptId}-retry-${payload.retryCount}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info(
        `[ReceiptQueueService] Enqueued OCR processing job ID: ${job.id} for Receipt: ${payload.receiptId}`
      );
    } catch (error) {
      logger.error('[ReceiptQueueService] Failed to enqueue receipt processing job:', error);
      throw error;
    }
  }
}

export const receiptQueueService = new ReceiptQueueService();
