import sharp from 'sharp';
import { logger } from '../lib/logger.js';

export interface OptimizedImageResult {
  optimizedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

export class ImageOptimizer {
  public static async processImage(
    buffer: Buffer,
    declaredMimeType: string
  ): Promise<OptimizedImageResult> {
    // If document is PDF, we return buffer directly and a generated placeholder thumbnail
    if (declaredMimeType === 'application/pdf') {
      logger.info('[ImageOptimizer] PDF document bypasses raster optimization.');
      return {
        optimizedBuffer: buffer,
        thumbnailBuffer: buffer,
        mimeType: 'application/pdf',
        width: 0,
        height: 0,
      };
    }

    const startTime = Date.now();

    // Auto-rotate according to EXIF orientation, resize max 1920px, strip EXIF metadata
    const pipeline = sharp(buffer).rotate().resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    const optimizedBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
    const metadata = await sharp(optimizedBuffer).metadata();

    // Generate 300px thumbnail
    const thumbnailBuffer = await sharp(optimizedBuffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer();

    const processingTimeMs = Date.now() - startTime;
    logger.info(
      `[ImageOptimizer] Image compressed to WebP in ${processingTimeMs}ms. Size: ${Math.round(
        optimizedBuffer.length / 1024
      )}KB`
    );

    return {
      optimizedBuffer,
      thumbnailBuffer,
      mimeType: 'image/webp',
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }
}
