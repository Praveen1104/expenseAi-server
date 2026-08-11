import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config.js';
import { logger } from '../lib/logger.js';

export const RECEIPT_QUEUE_NAME = 'receipt-processing-queue';

export const receiptQueue = process.env.NODE_ENV === 'test'
  ? {
      add: async () => ({ id: 'mock-job-id' }),
      getJobCounts: async () => ({ wait: 0, active: 0, delayed: 0, completed: 0, failed: 0 }),
      on: () => {},
    } as any
  : new Queue(RECEIPT_QUEUE_NAME, {
      connection: redisConfig.getClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

if (process.env.NODE_ENV !== 'test') {
  receiptQueue.on('error', (err: Error) => {
    logger.error('BullMQ Receipt Queue Error:', err);
  });
}
