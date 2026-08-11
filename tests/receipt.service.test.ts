import { ImageValidator } from '../src/services/imageValidator.service';
import { ValidationError } from '../src/utils/apiError';

describe('ImageValidator Unit Tests', () => {
  it('should throw ValidationError on empty buffer', async () => {
    const emptyBuffer = Buffer.from('');
    await expect(ImageValidator.validateImage(emptyBuffer, 'image/png')).rejects.toThrow(
      ValidationError
    );
  });

  it('should calculate valid sha256 hash for buffer', () => {
    const testBuffer = Buffer.from('test receipt content');
    const hash = ImageValidator.calculateHash(testBuffer);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA256 hex string length
  });
});
