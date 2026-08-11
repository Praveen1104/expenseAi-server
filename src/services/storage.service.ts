import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

export interface StorageSaveResult {
  storagePath: string;
  thumbnailPath: string;
}

export class StorageService {
  private baseDir: string;
  private receiptsDir: string;
  private thumbnailsDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    this.receiptsDir = path.join(this.baseDir, 'receipts');
    this.thumbnailsDir = path.join(this.baseDir, 'thumbnails');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.receiptsDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
    } catch (error) {
      logger.error('[StorageService] Error creating upload directories:', error);
    }
  }

  public async saveReceipt(
    optimizedBuffer: Buffer,
    thumbnailBuffer: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<StorageSaveResult> {
    await this.ensureDirectories();

    const uniqueId = crypto.randomUUID();
    const extension = mimeType === 'application/pdf' ? '.pdf' : '.webp';

    const mainFileName = `receipt-${uniqueId}${extension}`;
    const thumbFileName = `thumb-${uniqueId}${extension}`;

    const mainFullPath = path.join(this.receiptsDir, mainFileName);
    const thumbFullPath = path.join(this.thumbnailsDir, thumbFileName);

    await Promise.all([
      fs.writeFile(mainFullPath, optimizedBuffer),
      fs.writeFile(thumbFullPath, thumbnailBuffer),
    ]);

    const relativeStoragePath = `/uploads/receipts/${mainFileName}`;
    const relativeThumbnailPath = `/uploads/thumbnails/${thumbFileName}`;

    logger.info(`[StorageService] Saved file "${originalFileName}" as "${mainFileName}"`);

    return {
      storagePath: relativeStoragePath,
      thumbnailPath: relativeThumbnailPath,
    };
  }

  public async deleteFile(relativePath: string): Promise<void> {
    if (!relativePath) return;
    try {
      const fullPath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
      await fs.unlink(fullPath);
      logger.info(`[StorageService] Deleted file at ${fullPath}`);
    } catch (error) {
      logger.warn(`[StorageService] Failed to delete file at ${relativePath}:`, error);
    }
  }
}

export const storageService = new StorageService();
