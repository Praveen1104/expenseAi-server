import express, { Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middlewares/cors.middleware.js';
import { httpLoggerMiddleware } from './middlewares/logger.middleware.js';
import { requestIdMiddleware, attachRequestMeta } from './middlewares/requestId.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { globalErrorHandler } from './middlewares/errorHandler.middleware.js';
import rootRoutes from './routes/root.routes.js';
import v1Routes from './routes/index.js';
import { metricsMiddleware, metricsCollector } from './utils/metrics.js';

export const createApp = (): Express => {
  const app = express();

  // Core Security & Compression Middlewares
  app.use(helmet());
  app.use(compression());
  app.use(corsMiddleware);

  // Request Tracing & Logging
  app.use(requestIdMiddleware);
  app.use(attachRequestMeta);
  app.use(httpLoggerMiddleware);
  app.use(metricsMiddleware);

  // Rate Limiting & Body Parsing
  app.use(globalRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static file serving for uploads & thumbnails
  app.use('/uploads', express.static('uploads'));

  // Metrics endpoint (Prometheus format)
  app.get('/metrics', async (_req, res, next) => {
    try {
      res.set('Content-Type', 'text/plain');
      res.send(await metricsCollector.getPrometheusMetrics());
    } catch (error) {
      next(error);
    }
  });

  // API Routes
  app.use('/', rootRoutes);
  app.use('/api/v1', v1Routes);

  // Error Handling Middlewares
  app.use(notFoundMiddleware);
  app.use(globalErrorHandler);

  return app;
};
