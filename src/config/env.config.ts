import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/smartspend'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  OPENAI_API_KEY: z.string().optional().default('sk-placeholder-for-phase-1'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  JWT_ACCESS_SECRET: z.string().default('supersecretaccesskey'),
  JWT_REFRESH_SECRET: z.string().default('supersecretrefreshkey'),
  STORAGE_DIR: z.string().default(process.env.NODE_ENV === 'production' ? '/tmp/uploads' : 'uploads'),
}).refine((data) => {
  // In production, reject default development secrets
  if (data.NODE_ENV === 'production') {
    if (data.JWT_ACCESS_SECRET === 'supersecretaccesskey' || data.JWT_REFRESH_SECRET === 'supersecretrefreshkey') {
      return false;
    }
  }
  return true;
}, {
  message: "Critical error: You must configure secure non-default JWT secrets in production!",
  path: ["JWT_ACCESS_SECRET"],
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment configuration:', JSON.stringify(_env.error.format(), null, 2));
  throw new Error('Environment variable validation failed');
}

export const env = _env.data;
