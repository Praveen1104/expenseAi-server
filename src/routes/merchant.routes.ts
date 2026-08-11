import { Router } from 'express';
import { getMerchants, getMerchantById } from '../controllers/merchant.controller.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

router.get('/', asyncWrapper(getMerchants));
router.get('/:id', asyncWrapper(getMerchantById));

export default router;
