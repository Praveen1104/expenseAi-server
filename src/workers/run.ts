import { dbConfig } from '../config/database.config.js';
import { redisConfig } from '../config/redis.config.js';
import { initWorkers } from './index.js';
import { logger } from '../lib/logger.js';

const startWorkerNode = async () => {
  try {
    logger.info('[BullMQ Worker] Starting dedicated Queue Worker process...');

    // Connect to services
    await dbConfig.connect();
    await redisConfig.connect();

    // Start workers
    const worker = initWorkers();
    if (!worker) {
      throw new Error('Worker initialization returned null');
    }

    logger.info('[BullMQ Worker] Queue Worker successfully booted and listening for jobs.');

    const shutdown = async (signal: string) => {
      logger.warn(`[BullMQ Worker] Received ${signal}. Stopping worker gracefully...`);
      
      // Stop worker from accepting new jobs and wait for active ones
      if (worker) {
        await worker.close();
        logger.info('[BullMQ Worker] Worker closed. No new jobs will be processed.');
      }

      await dbConfig.disconnect();
      await redisConfig.disconnect();
      logger.info('[BullMQ Worker] Graceful worker shutdown completed.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('[BullMQ Worker] Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('[BullMQ Worker] Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error) {
    logger.error('[BullMQ Worker] Fatal error starting Queue Worker:', error);
    process.exit(1);
  }
};

startWorkerNode();
