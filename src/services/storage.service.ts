import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.config.js';

export interface StorageSaveResult {
  storagePath: string;
  thumbnailPath: string;
}

export class StorageService {
  constructor() {
    // Configure Cloudinary SDK
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    logger.info('[StorageService] Initialized Cloudinary storage client');
  }

  private uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error(`[StorageService] Cloudinary upload failed in folder ${folder}:`, error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty result'));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }

  public async saveReceipt(
    optimizedBuffer: Buffer,
    thumbnailBuffer: Buffer,
    originalFileName: string,
    _mimeType: string
  ): Promise<StorageSaveResult> {
    logger.info(`[StorageService] Uploading file "${originalFileName}" to Cloudinary`);

    const [storagePath, thumbnailPath] = await Promise.all([
      this.uploadBuffer(optimizedBuffer, 'smartspend/receipts'),
      this.uploadBuffer(thumbnailBuffer, 'smartspend/thumbnails'),
    ]);

    logger.info(`[StorageService] Successfully uploaded both receipt and thumbnail to Cloudinary`);

    return {
      storagePath,
      thumbnailPath,
    };
  }

  public async deleteFile(relativePath: string): Promise<void> {
    if (!relativePath) return;

    // Check if it is a Cloudinary URL
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      try {
        // Extract public ID from Cloudinary URL:
        // e.g. https://res.cloudinary.com/dhopqnmyr/image/upload/v1723364712/smartspend/receipts/receipt-abc.webp
        // Matches everything after /upload/(vXXXXX/) up to the dot extension
        const matches = relativePath.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        if (matches && matches[1]) {
          const publicId = matches[1];
          logger.info(`[StorageService] Deleting remote Cloudinary asset with public ID: ${publicId}`);
          await cloudinary.uploader.destroy(publicId);
          logger.info(`[StorageService] Successfully deleted remote asset ${publicId}`);
        } else {
          logger.warn(`[StorageService] Could not parse Cloudinary public ID from URL: ${relativePath}`);
        }
      } catch (error) {
        logger.error(`[StorageService] Failed to delete Cloudinary asset at ${relativePath}:`, error);
      }
      return;
    }

    // Fallback for local files (backward compatibility/tests)
    try {
      const resolvedPath = relativePath.startsWith('uploads/')
        ? path.resolve(process.cwd(), relativePath)
        : path.resolve(process.cwd(), relativePath.replace(/^\//, ''));

      await fs.unlink(resolvedPath);
      logger.info(`[StorageService] Deleted local fallback file at ${resolvedPath}`);
    } catch (error) {
      logger.warn(`[StorageService] Failed to delete local fallback file at ${relativePath}:`, error);
    }
  }
}

export const storageService = new StorageService();
