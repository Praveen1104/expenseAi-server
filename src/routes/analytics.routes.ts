import { Router } from 'express';
import {
  getSummary,
  getCategories,
  getMerchants,
  getTrends,
  generateInsights,
} from '../controllers/analytics.controller.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

router.get('/summary', asyncWrapper(getSummary));
router.get('/categories', asyncWrapper(getCategories));
router.get('/merchants', asyncWrapper(getMerchants));
router.get('/trends', asyncWrapper(getTrends));
router.post('/insights', asyncWrapper(generateInsights));

export default router;
