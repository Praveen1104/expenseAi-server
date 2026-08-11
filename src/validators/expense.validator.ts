import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants/expense.constants.js';

export const createExpenseSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title cannot be empty'),
  merchant: z.string({ required_error: 'Merchant name is required' }).trim().min(1, 'Merchant name cannot be empty'),
  category: z.enum(EXPENSE_CATEGORIES, {
    required_error: 'Category is required',
    invalid_type_error: 'Invalid category specified',
  }),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than zero'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    required_error: 'Payment method is required',
    invalid_type_error: 'Invalid payment method specified',
  }),
  transactionDate: z.coerce.date({
    required_error: 'Transaction date is required',
    invalid_type_error: 'Invalid transaction date',
  }),
  notes: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  merchant: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest_amount', 'lowest_amount', 'merchant']).default('newest'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
