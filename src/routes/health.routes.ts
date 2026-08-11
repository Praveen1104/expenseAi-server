import { Router } from 'express';
import { getLive, getReady, getHealthSummary } from '../controllers/health.controller.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

router.get('/', asyncWrapper(getHealthSummary));
router.get('/live', getLive);
router.get('/ready', asyncWrapper(getReady));

export default router;
