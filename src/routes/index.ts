import { Router } from 'express';
import healthRoutes from './health.routes.js';
import expenseRoutes from './expense.routes.js';
import receiptRoutes from './receipt.routes.js';
import merchantRoutes from './merchant.routes.js';
import analyticsRoutes from './analytics.routes.js';

import reportRoutes from './report.routes.js';
import authRoutes from './auth.routes.js';
import budgetRoutes from './budget.routes.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected routes (Data Isolation & Authentication required)
router.use('/expenses', authenticate, expenseRoutes);
router.use('/receipts', authenticate, receiptRoutes);
router.use('/merchants', authenticate, merchantRoutes);
router.use('/analytics', authenticate, analyticsRoutes);
router.use('/budgets', authenticate, budgetRoutes);
router.use('/', authenticate, reportRoutes);

export default router;
