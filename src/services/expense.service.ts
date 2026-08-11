import mongoose from 'mongoose';
import { expenseRepository, PaginatedResult } from '../repositories/expense.repository.js';
import { CreateExpenseInput, UpdateExpenseInput, ExpenseQueryInput } from '../validators/expense.validator.js';
import { IExpense } from '../models/expense.model.js';
import { NotFoundError } from '../utils/apiError.js';
import { logger } from '../lib/logger.js';
import { AuditService } from './report/audit.service.js';

export class ExpenseService {
  public async createExpense(input: CreateExpenseInput & { userId: string }): Promise<IExpense> {
    logger.info(`[ExpenseService] Creating expense for merchant: "${input.merchant}", amount: ${input.amount} ${input.currency}`);
    const expense = await expenseRepository.create({
      ...input,
      userId: new mongoose.Types.ObjectId(input.userId) as any,
    });
    logger.info(`[ExpenseService] Expense created successfully with ID: ${expense._id}`);

    await AuditService.log({
      entityType: 'Expense',
      entityId: String(expense._id),
      action: 'Expense Created',
      newValue: typeof expense.toObject === 'function' ? expense.toObject() : expense,
      userId: String(expense.userId),
    });

    return expense;
  }

  public async getExpenseById(id: string, userId: string): Promise<IExpense> {
    const expense = await expenseRepository.findByIdAndUser(id, userId);
    if (!expense) {
      throw new NotFoundError(`Expense with ID "${id}" was not found`);
    }
    return expense;
  }

  public async getExpenses(query: ExpenseQueryInput, userId: string): Promise<PaginatedResult<IExpense>> {
    if (query.search) {
      logger.info(`[ExpenseService] Searching expenses with query term: "${query.search}" for user ${userId}`);
    } else {
      logger.info(`[ExpenseService] Fetching expenses list page: ${query.page}, limit: ${query.limit} for user ${userId}`);
    }
    return expenseRepository.findExpenses(query, userId);
  }

  public async updateExpense(id: string, input: UpdateExpenseInput, userId: string): Promise<IExpense> {
    logger.info(`[ExpenseService] Updating expense ID: ${id} for user ${userId}`);
    const existing = await this.getExpenseById(id, userId);

    const updated = await expenseRepository.updateByUser(id, input, userId);
    if (!updated) {
      throw new NotFoundError(`Expense with ID "${id}" was not found for update`);
    }

    logger.info(`[ExpenseService] Expense updated successfully ID: ${id}. Amount changed from ${existing.amount} to ${updated.amount}`);

    await AuditService.log({
      entityType: 'Expense',
      entityId: id,
      action: 'Expense Updated',
      oldValue: typeof existing.toObject === 'function' ? existing.toObject() : existing,
      newValue: typeof updated.toObject === 'function' ? updated.toObject() : updated,
      userId: String(existing.userId),
    });

    return updated;
  }

  public async deleteExpense(id: string, userId: string): Promise<void> {
    logger.info(`[ExpenseService] Deleting expense ID: ${id} for user ${userId}`);
    const existing = await this.getExpenseById(id, userId); // Ensures entity exists & belongs to user
    await expenseRepository.deleteByUser(id, userId);
    logger.info(`[ExpenseService] Expense deleted successfully ID: ${id}`);

    await AuditService.log({
      entityType: 'Expense',
      entityId: id,
      action: 'Expense Deleted',
      oldValue: typeof existing.toObject === 'function' ? existing.toObject() : existing,
      userId: String(existing.userId),
    });
  }
}

export const expenseService = new ExpenseService();
