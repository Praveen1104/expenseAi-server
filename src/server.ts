import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { dbConfig } from './config/database.config.js';
import { redisConfig } from './config/redis.config.js';
import { initWorkers } from './workers/index.js';
import { logger } from './lib/logger.js';

const startServer = async () => {
  try {
    logger.info('Starting SmartSpend AI Backend Initialization...');

    // Initialize Database & Redis connections
    await dbConfig.connect();
    await redisConfig.connect();

    let workerInstance: any = null;
    if (env.NODE_ENV !== 'production' || process.env.RUN_WORKER === 'true') {
      workerInstance = initWorkers();
    }

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`==================================================`);
      logger.info(`🚀 SmartSpend AI API Server running on port ${env.PORT}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`📡 Health check: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`==================================================`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Starting graceful shutdown...`);

      // Close the HTTP server first (stop accepting new connections)
      server.close(async () => {
        logger.info('HTTP Server closed.');

        // Close the BullMQ queue worker
        if (workerInstance) {
          logger.info('Closing BullMQ queue worker...');
          await workerInstance.close();
          logger.info('BullMQ worker stopped.');
        }

        // Disconnect DB and Redis connection pools
        await dbConfig.disconnect();
        await redisConfig.disconnect();
        logger.info('Graceful shutdown completed successfully.');
        process.exit(0);
      });

      // Force shutdown after 10s if connections hanging
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

startServer();
