import { Router } from 'express';
import {
  uploadReceipt,
  getReceipts,
  getReceiptById,
  deleteReceipt,
  retryReceipt,
  processReceiptOCR,
  getReceiptExtraction,
} from '../controllers/receipt.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

router.post('/upload', uploadMiddleware.single('file'), asyncWrapper(uploadReceipt));
router.get('/', asyncWrapper(getReceipts));
router.get('/:id', asyncWrapper(getReceiptById));
router.delete('/:id', asyncWrapper(deleteReceipt));
router.post('/:id/retry', asyncWrapper(retryReceipt));

// Phase 4 AI Vision OCR Routes
router.post('/:id/process', asyncWrapper(processReceiptOCR));
router.get('/:id/extraction', asyncWrapper(getReceiptExtraction));

export default router;
