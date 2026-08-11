import { redisConfig } from '../config/redis.config.js';

export const redisClient = redisConfig.getClient();
