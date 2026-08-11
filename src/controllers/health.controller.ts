import { Request, Response } from 'express';
import { dbConfig } from '../config/database.config.js';
import { redisConfig } from '../config/redis.config.js';
import { receiptQueue } from '../queues/receipt.queue.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

export const getLive = (_req: Request, res: Response): void => {
  res.status(STATUS_CODES.OK).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
};

export const getReady = async (_req: Request, res: Response): Promise<void> => {
  const dbHealth = await dbConfig.getHealthStatus();
  const redisHealth = await redisConfig.getHealthStatus();

  let queueStatus = 'connected';
  let queueStats = {};

  try {
    const counts = await receiptQueue.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed');
    queueStats = counts;
  } catch (error) {
    queueStatus = 'disconnected';
  }

  const isReady = dbHealth.status === 'connected' && redisHealth.status === 'connected' && queueStatus === 'connected';

  res.status(isReady ? STATUS_CODES.OK : STATUS_CODES.SERVICE_UNAVAILABLE).json({
    success: isReady,
    data: {
      status: isReady ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        redis: redisHealth,
        queue: {
          status: queueStatus,
          details: queueStats,
        },
      },
    },
  });
};

export const getHealthSummary = async (_req: Request, res: Response): Promise<void> => {
  const dbHealth = await dbConfig.getHealthStatus();
  const redisHealth = await redisConfig.getHealthStatus();
  
  let queueStats = {};
  let queueStatus = 'connected';
  try {
    queueStats = await receiptQueue.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed');
  } catch {
    queueStatus = 'disconnected';
  }

  res.status(STATUS_CODES.OK).json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      services: {
        database: dbHealth.status,
        redis: redisHealth.status,
        queue: queueStatus,
      },
      queueStats,
    },
  });
};
