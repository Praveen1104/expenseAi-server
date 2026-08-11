import { parse } from 'json2csv';
import { IExpense } from '../../models/expense.model.js';
import { CategoryBreakdownResult, MerchantLeaderboardResult } from '../analytics/aggregation.service.js';

export class CSVService {
  /**
   * Export expenses, categories, and merchants into clean CSV format.
   */
  public static generateCSV(
    expenses: IExpense[],
    categories: CategoryBreakdownResult[],
    merchants: MerchantLeaderboardResult[]
  ): string {
    const formattedExpenses = expenses.map((exp) => ({
      ID: String(exp._id),
      Date: new Date(exp.transactionDate).toISOString().split('T')[0],
      Category: exp.category,
      Merchant: exp.merchant,
      Amount: exp.amount,
      PaymentMethod: exp.paymentMethod,
      IsRecurring: exp.isRecurring ? 'Yes' : 'No',
      Note: exp.notes || '',
    }));

    const expenseCSV = parse(formattedExpenses, {
      fields: ['ID', 'Date', 'Category', 'Merchant', 'Amount', 'PaymentMethod', 'IsRecurring', 'Note'],
    });

    const categoryCSV = parse(
      categories.map((c) => ({
        Category: c.category,
        TotalAmount: c.totalAmount,
        Count: c.count,
        Percentage: `${c.percentage.toFixed(2)}%`,
      })),
      { fields: ['Category', 'TotalAmount', 'Count', 'Percentage'] }
    );

    const merchantCSV = parse(
      merchants.map((m) => ({
        Merchant: m.merchant,
        TotalAmount: m.totalAmount,
        VisitCount: m.visitCount,
      })),
      { fields: ['Merchant', 'TotalAmount', 'VisitCount'] }
    );

    return `=== EXPENSES ===\n${expenseCSV}\n\n=== CATEGORY BREAKDOWN ===\n${categoryCSV}\n\n=== MERCHANT LEADERBOARD ===\n${merchantCSV}`;
  }
}
