import mongoose from 'mongoose';
import { env } from './env.config.js';
import { logger } from '../lib/logger.js';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB connection already established.');
      return;
    }

    try {
      mongoose.set('strictQuery', true);

      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        this.isConnected = false;
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        logger.warn('MongoDB connection disconnected');
      });

      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      // We don't crash process here in order to allow health check reporting
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting MongoDB:', error);
    }
  }

  public async getHealthStatus(): Promise<{ status: 'connected' | 'disconnected'; latencyMs?: number }> {
    const startTime = Date.now();
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        const latencyMs = Date.now() - startTime;
        return { status: 'connected', latencyMs };
      }
      return { status: 'disconnected' };
    } catch {
      return { status: 'disconnected' };
    }
  }
}

export const dbConfig = DatabaseConfig.getInstance();
