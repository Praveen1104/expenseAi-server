import { dbConfig } from '../config/database.config.js';
import { redisConfig } from '../config/redis.config.js';
import { env } from '../config/env.config.js';
import { HealthStatus } from '../types/index.js';

export class HealthService {
  public async checkHealth(): Promise<HealthStatus> {
    const mongoHealth = await dbConfig.getHealthStatus();
    const redisHealth = await redisConfig.getHealthStatus();

    const isMongoOk = mongoHealth.status === 'connected';
    const isRedisOk = redisHealth.status === 'connected';

    let status: HealthStatus['status'] = 'ok';
    if (!isMongoOk && !isRedisOk) {
      status = 'error';
    } else if (!isMongoOk || !isRedisOk) {
      status = 'degraded';
    }

    const memory = process.memoryUsage();

    return {
      status,
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: mongoHealth,
        redis: redisHealth,
      },
      memoryUsage: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      },
    };
  }
}

export const healthService = new HealthService();
