import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  enrichExpense,
} from '../controllers/expense.controller.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

router.post('/', asyncWrapper(createExpense));
router.get('/', asyncWrapper(getExpenses));
router.get('/:id', asyncWrapper(getExpenseById));
router.put('/:id', asyncWrapper(updateExpense));
router.delete('/:id', asyncWrapper(deleteExpense));
router.post('/:id/enrich', asyncWrapper(enrichExpense));

export default router;
