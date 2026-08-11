import { BaseRepository } from './base.repository.js';
import { ExpenseModel, IExpense } from '../models/expense.model.js';
import { ExpenseQueryInput } from '../validators/expense.validator.js';
import mongoose, { FilterQuery, SortOrder } from 'mongoose';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalAmount: number;
  };
}

export class ExpenseRepository extends BaseRepository<IExpense> {
  constructor() {
    super(ExpenseModel);
  }

  public async findExpenses(query: ExpenseQueryInput, userId: string): Promise<PaginatedResult<IExpense>> {
    const {
      page,
      limit,
      search,
      category,
      merchant,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy,
    } = query;

    const filter: FilterQuery<IExpense> = { userId: new mongoose.Types.ObjectId(userId) as any };

    // Category Filter
    if (category) {
      filter.category = category;
    }

    // Merchant Filter
    if (merchant) {
      filter.merchant = { $regex: merchant, $options: 'i' };
    }

    // Payment Method Filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Date Range Filter
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = startDate;
      if (endDate) filter.transactionDate.$lte = endDate;
    }

    // Amount Range Filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.amount = {};
      if (minAmount !== undefined) filter.amount.$gte = minAmount;
      if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
    }

    // Search Query (Search across title, merchant, notes, tags)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { merchant: searchRegex },
        { notes: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Sort strategy
    let sortOptions: Record<string, SortOrder> = { transactionDate: -1, _id: -1 };
    switch (sortBy) {
      case 'oldest':
        sortOptions = { transactionDate: 1, _id: 1 };
        break;
      case 'highest_amount':
        sortOptions = { amount: -1, _id: -1 };
        break;
      case 'lowest_amount':
        sortOptions = { amount: 1, _id: 1 };
        break;
      case 'merchant':
        sortOptions = { merchant: 1, _id: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { transactionDate: -1, _id: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    // Execute query & count concurrently
    const [items, totalItems, summaryResult] = await Promise.all([
      this.model.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
      this.model.aggregate([
        { $match: filter },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;
    const totalAmount = summaryResult[0]?.totalAmount || 0;

    return {
      data: items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        totalAmount,
      },
    };
  }
}

export const expenseRepository = new ExpenseRepository();
