import multer from 'multer';
import { ValidationError } from '../utils/apiError.js';

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Single file upload limit per request
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new ValidationError(
          `Unsupported file format: "${file.mimetype}". Allowed formats: JPEG, PNG, WEBP, PDF`
        )
      );
    }
    cb(null, true);
  },
});
