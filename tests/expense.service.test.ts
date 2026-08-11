import { ExpenseService } from '../src/services/expense.service';
import { expenseRepository } from '../src/repositories/expense.repository';
import { NotFoundError } from '../src/utils/apiError';

jest.mock('../src/repositories/expense.repository');
jest.mock('../src/services/report/audit.service');

describe('ExpenseService Unit Tests', () => {
  let expenseService: ExpenseService;

  beforeEach(() => {
    expenseService = new ExpenseService();
    jest.clearAllMocks();
  });

  describe('createExpense', () => {
    it('should call repository create and return the created expense', async () => {
      const mockInput = {
        title: 'Lunch with Client',
        merchant: 'Bistro Cafe',
        category: 'Food' as const,
        amount: 45.5,
        currency: 'USD',
        paymentMethod: 'Credit Card' as const,
        transactionDate: new Date(),
        notes: 'Project kickoff discussion',
        tags: ['client', 'food'],
        userId: '507f1f77bcf86cd799439011',
      };

      const mockCreatedExpense = { _id: '507f1f77bcf86cd799439011', ...mockInput };
      (expenseRepository.create as jest.Mock).mockResolvedValue(mockCreatedExpense);

      const result = await expenseService.createExpense(mockInput);
      expect(expenseRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Lunch with Client',
        amount: 45.5,
      }));
      expect(result._id).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('getExpenseById', () => {
    it('should throw NotFoundError if expense does not exist', async () => {
      (expenseRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);
      await expect(expenseService.getExpenseById('non-existent-id', 'test-user-id')).rejects.toThrow(NotFoundError);
    });

    it('should return expense if found', async () => {
      const mockExpense = { _id: '123', title: 'Coffee' };
      (expenseRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockExpense);
      const result = await expenseService.getExpenseById('123', 'test-user-id');
      expect(result).toEqual(mockExpense);
    });
  });
});
