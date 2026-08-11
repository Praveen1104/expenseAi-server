import { Redis } from 'ioredis';
import { env } from './env.config.js';
import { logger } from '../lib/logger.js';

class MemoryRedisMock {
  private store = new Map<string, string>();

  public async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  public async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  public async setex(key: string, seconds: number, value: string): Promise<string> {
    this.store.set(key, value);
    setTimeout(() => this.store.delete(key), seconds * 1000);
    return 'OK';
  }

  public async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  public async ping(): Promise<string> {
    return 'PONG';
  }

  public async quit(): Promise<string> {
    return 'OK';
  }

  public on(event: string, callback: (...args: any[]) => void): this {
    if (event === 'connect') {
      setTimeout(callback, 0);
    }
    return this;
  }
}

export class RedisConfig {
  private static instance: RedisConfig;
  private client: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  public getClient(): Redis {
    if (process.env.NODE_ENV === 'test') {
      if (!this.client) {
        logger.info('[RedisConfig] Creating in-memory mock client for Jest testing environment');
        this.client = new MemoryRedisMock() as any;
      }
      return this.client as Redis;
    }

    if (!this.client) {
      const redisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy(times: number) {
          if (times > 20) {
            return null; // Stop retrying after 20 attempts
          }
          return Math.min(times * 100, 2000);
        },
      };

      this.client = new Redis(env.REDIS_URL, redisOptions);

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.client.on('error', (err: any) => {
        logger.error('Redis error:', err.message);
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
      });
    }
    return this.client;
  }

  public async connect(): Promise<void> {
    const client = this.getClient();
    try {
      if (process.env.NODE_ENV !== 'test' && client.status === 'wait') {
        await client.connect();
      }
    } catch (error) {
      logger.error('Redis connect attempt failed:', error);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis disconnected gracefully');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      }
    }
  }

  public async getHealthStatus(): Promise<{ status: 'connected' | 'disconnected'; latencyMs?: number }> {
    const startTime = Date.now();
    try {
      const client = this.getClient();
      const response = await client.ping();
      if (response === 'PONG') {
        const latencyMs = Date.now() - startTime;
        return { status: 'connected', latencyMs };
      }
      return { status: 'disconnected' };
    } catch {
      return { status: 'disconnected' };
    }
  }
}

export const redisConfig = RedisConfig.getInstance();
