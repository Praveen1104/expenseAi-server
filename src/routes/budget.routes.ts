import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const router = Router();

// Budgets CRUD
router.post('/', asyncWrapper(BudgetController.createBudget));
router.get('/', asyncWrapper(BudgetController.getBudgets));
router.put('/:id', asyncWrapper(BudgetController.updateBudget));
router.delete('/:id', asyncWrapper(BudgetController.deleteBudget));

// Projections & AI Advisor
router.get('/forecast', asyncWrapper(BudgetController.getForecast));
router.get('/recommendations', asyncWrapper(BudgetController.getRecommendations));

// Savings Goals
router.post('/savings-goals', asyncWrapper(BudgetController.createSavingsGoal));
router.get('/savings-goals', asyncWrapper(BudgetController.getSavingsGoals));
router.put('/savings-goals/:id', asyncWrapper(BudgetController.updateSavingsGoal));

export default router;
