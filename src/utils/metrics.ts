import { Request, Response, NextFunction } from 'express';
import { dbConfig } from '../config/database.config.js';
import { redisConfig } from '../config/redis.config.js';
import { receiptQueue } from '../queues/receipt.queue.js';

class MetricsCollector {
  private static instance: MetricsCollector;

  // In-memory metrics stores
  public httpRequestsTotal: Record<string, number> = {};
  public httpRequestDurations: number[] = [];
  public openAiLatencyMs: number[] = [];
  public openAiPromptTokens = 0;
  public openAiCompletionTokens = 0;
  public ocrSuccessCount = 0;
  public ocrFailureCount = 0;

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public recordRequest(method: string, path: string, status: number, durationMs: number) {
    const key = `method="${method}",path="${path}",status="${status}"`;
    this.httpRequestsTotal[key] = (this.httpRequestsTotal[key] || 0) + 1;
    this.httpRequestDurations.push(durationMs / 1000); // convert to seconds
    if (this.httpRequestDurations.length > 1000) this.httpRequestDurations.shift(); // sliding window
  }

  public recordOpenAiCall(tokens: { prompt: number; completion: number }, latencyMs: number) {
    this.openAiPromptTokens += tokens.prompt;
    this.openAiCompletionTokens += tokens.completion;
    this.openAiLatencyMs.push(latencyMs);
    if (this.openAiLatencyMs.length > 50) this.openAiLatencyMs.shift();
  }

  public recordOcr(success: boolean) {
    if (success) {
      this.ocrSuccessCount++;
    } else {
      this.ocrFailureCount++;
    }
  }

  public async getPrometheusMetrics(): Promise<string> {
    const dbHealth = await dbConfig.getHealthStatus();
    const redisHealth = await redisConfig.getHealthStatus();

    let queueJobsCount = 0;
    try {
      queueJobsCount = await receiptQueue.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed').then(
        (c: any) => c.wait + c.active + c.delayed
      );
    } catch {
      // queue unavailable
    }

    const avgReqDuration = this.httpRequestDurations.length
      ? this.httpRequestDurations.reduce((a, b) => a + b, 0) / this.httpRequestDurations.length
      : 0;

    const avgOpenAiDurationMs = this.openAiLatencyMs.length
      ? this.openAiLatencyMs.reduce((a, b) => a + b, 0) / this.openAiLatencyMs.length
      : 0;

    const ocrSuccessRate = (this.ocrSuccessCount + this.ocrFailureCount) > 0
      ? this.ocrSuccessCount / (this.ocrSuccessCount + this.ocrFailureCount)
      : 1.0;

    let lines = [
      '# HELP http_requests_total Total HTTP requests handled',
      '# TYPE http_requests_total counter',
    ];

    for (const [labels, val] of Object.entries(this.httpRequestsTotal)) {
      lines.push(`http_requests_total{${labels}} ${val}`);
    }

    lines.push(
      '',
      '# HELP http_request_duration_seconds Average HTTP request duration in seconds',
      '# TYPE http_request_duration_seconds gauge',
      `http_request_duration_seconds ${avgReqDuration.toFixed(4)}`,
      '',
      '# HELP database_connected Database connection state (1 for connected, 0 for disconnected)',
      '# TYPE database_connected gauge',
      `database_connected ${dbHealth.status === 'connected' ? 1 : 0}`,
      '',
      '# HELP redis_connected Redis connection state (1 for connected, 0 for disconnected)',
      '# TYPE redis_connected gauge',
      `redis_connected ${redisHealth.status === 'connected' ? 1 : 0}`,
      '',
      '# HELP queue_depth_jobs Total jobs currently pending in the processing queue',
      '# TYPE queue_depth_jobs gauge',
      `queue_depth_jobs ${queueJobsCount}`,
      '',
      '# HELP openai_latency_seconds Average OpenAI completion latency in seconds',
      '# TYPE openai_latency_seconds gauge',
      `openai_latency_seconds ${(avgOpenAiDurationMs / 1000).toFixed(4)}`,
      '',
      '# HELP openai_tokens_prompt_total Cumulative prompt tokens used',
      '# TYPE openai_tokens_prompt_total counter',
      `openai_tokens_prompt_total ${this.openAiPromptTokens}`,
      '',
      '# HELP openai_tokens_completion_total Cumulative completion tokens used',
      '# TYPE openai_tokens_completion_total counter',
      `openai_tokens_completion_total ${this.openAiCompletionTokens}`,
      '',
      '# HELP ocr_success_rate OCR extraction success rate fraction',
      '# TYPE ocr_success_rate gauge',
      `ocr_success_rate ${ocrSuccessRate.toFixed(4)}`
    );

    return lines.join('\n');
  }
}

export const metricsCollector = MetricsCollector.getInstance();

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Exclude health and metrics endpoints themselves to keep stats clean
    if (!req.path.startsWith('/api/v1/health') && !req.path.startsWith('/metrics')) {
      metricsCollector.recordRequest(req.method, req.path, res.statusCode, duration);
    }
  });
  next();
};
