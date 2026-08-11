import cors from 'cors';
import { env } from '../config/env.config.js';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, testing tools, or node fetch)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = env.CORS_ORIGIN.includes(',')
      ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [env.CORS_ORIGIN];

    // Check for exact matches
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Support dynamic Vercel preview deployment URLs
    // e.g. https://expense-ai-client-git-branch-username.vercel.app
    const isVercelPreview = origin.startsWith('https://expense-ai-client-') && origin.endsWith('.vercel.app');
    if (isVercelPreview) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
});
