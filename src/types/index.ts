export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  services: {
    mongodb: ServiceHealth;
    redis: ServiceHealth;
  };
  memoryUsage: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
}

export interface ServiceHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  latencyMs?: number;
  message?: string;
}

export interface ApiRootResponse {
  name: string;
  version: string;
  description: string;
  timestamp: string;
  environment: string;
}
