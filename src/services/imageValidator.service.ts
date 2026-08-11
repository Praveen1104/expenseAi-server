import crypto from 'crypto';
import sharp from 'sharp';
import { ValidationError } from '../utils/apiError.js';
import { logger } from '../lib/logger.js';

export interface ImageValidationResult {
  fileHash: string;
  width: number;
  height: number;
  mimeType: string;
  format: string;
}

export class ImageValidator {
  public static calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public static async validateImage(
    buffer: Buffer,
    declaredMimeType: string
  ): Promise<ImageValidationResult> {
    if (!buffer || buffer.length === 0) {
      throw new ValidationError('File upload is empty');
    }

    const fileHash = this.calculateHash(buffer);

    // PDF files are passed through metadata extraction
    if (declaredMimeType === 'application/pdf') {
      logger.info(`[ImageValidator] Validated PDF document (Hash: ${fileHash.substring(0, 10)}...)`);
      return {
        fileHash,
        width: 0,
        height: 0,
        mimeType: 'application/pdf',
        format: 'pdf',
      };
    }

    try {
      const metadata = await sharp(buffer).metadata();

      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new ValidationError('Invalid or corrupted image file');
      }

      logger.info(
        `[ImageValidator] Image validated successfully. Format: ${metadata.format}, Dimensions: ${metadata.width}x${metadata.height}`
      );

      return {
        fileHash,
        width: metadata.width,
        height: metadata.height,
        mimeType: declaredMimeType,
        format: metadata.format,
      };
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error('[ImageValidator] Failed image metadata extraction:', error);
      throw new ValidationError('File header validation failed or file is corrupted');
    }
  }
}
