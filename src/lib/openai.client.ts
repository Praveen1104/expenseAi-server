import OpenAI from 'openai';
import { env } from '../config/env.config.js';
import { logger } from './logger.js';

class OpenAIClient {
  private static instance: OpenAIClient;
  private client: OpenAI | null = null;

  private constructor() {}

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  public getClient(): OpenAI {
    if (!this.client) {
      if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'sk-placeholder-for-phase-1') {
        logger.warn('OpenAI API Key is not set or is using placeholder. OpenAI functionality will be limited.');
      }
      this.client = new OpenAI({
        apiKey: env.OPENAI_API_KEY || 'dummy_key',
      });
    }
    return this.client;
  }
}

export const openAIClient = OpenAIClient.getInstance();
