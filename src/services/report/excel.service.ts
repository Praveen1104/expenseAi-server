import ExcelJS from 'exceljs';
import { IExpense } from '../../models/expense.model.js';
import { SummaryStatsResult, CategoryBreakdownResult, MerchantLeaderboardResult } from '../analytics/aggregation.service.js';
import { BudgetWithUsage } from '../budget/budget.service.js';
import { EnrichedForecast } from '../budget/forecast.service.js';

export class ExcelService {
  /**
   * Generates production multi-tab Excel Workbook (.xlsx).
   * Sheets: Overview | Expenses | Categories | Merchants | Budgets | Forecast
   */
  public static async generateExcel(
    summaryStats: SummaryStatsResult,
    expenses: IExpense[],
    categories: CategoryBreakdownResult[],
    merchants: MerchantLeaderboardResult[],
    budgets: BudgetWithUsage[],
    forecast?: EnrichedForecast
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartSpend AI Engine';
    workbook.created = new Date();

    // 1. Sheet: Overview
    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 25 },
    ];
    overviewSheet.addRows([
      { metric: 'Total Amount', value: summaryStats.totalAmount },
      { metric: 'Total Expenses Count', value: summaryStats.totalExpenses },
      { metric: 'Average Expense', value: summaryStats.averageAmount },
      { metric: 'Highest Single Expense', value: summaryStats.highestAmount },
      { metric: 'Lowest Single Expense', value: summaryStats.lowestAmount },
      { metric: 'Recurring Spend', value: summaryStats.recurringAmount },
      { metric: 'Monthly Growth Percent', value: `${summaryStats.monthlyGrowthPercent}%` },
      { metric: 'Top Category', value: summaryStats.topCategory },
      { metric: 'Top Merchant', value: summaryStats.topMerchant },
    ]);
    overviewSheet.getRow(1).font = { bold: true };

    // 2. Sheet: Expenses
    const expenseSheet = workbook.addWorksheet('Expenses');
    expenseSheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Merchant', key: 'merchant', width: 25 },
      { header: 'Amount ($)', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Recurring', key: 'recurring', width: 12 },
      { header: 'Notes', key: 'note', width: 30 },
    ];
    expenses.forEach((exp) => {
      expenseSheet.addRow({
        id: String(exp._id),
        date: new Date(exp.transactionDate).toISOString().split('T')[0],
        category: exp.category,
        merchant: exp.merchant,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod,
        recurring: exp.isRecurring ? 'Yes' : 'No',
        note: exp.notes || '',
      });
    });
    expenseSheet.getRow(1).font = { bold: true };

    // 3. Sheet: Categories
    const categorySheet = workbook.addWorksheet('Categories');
    categorySheet.columns = [
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Total Spend ($)', key: 'totalAmount', width: 18 },
      { header: 'Transaction Count', key: 'count', width: 18 },
      { header: 'Percentage of Total (%)', key: 'percentage', width: 22 },
    ];
    categories.forEach((cat) => {
      categorySheet.addRow({
        category: cat.category,
        totalAmount: cat.totalAmount,
        count: cat.count,
        percentage: `${cat.percentage.toFixed(2)}%`,
      });
    });
    categorySheet.getRow(1).font = { bold: true };

    // 4. Sheet: Merchants
    const merchantSheet = workbook.addWorksheet('Merchants');
    merchantSheet.columns = [
      { header: 'Merchant Name', key: 'merchant', width: 25 },
      { header: 'Total Spend ($)', key: 'totalAmount', width: 18 },
      { header: 'Visits / Tx Count', key: 'visitCount', width: 18 },
    ];
    merchants.forEach((mer) => {
      merchantSheet.addRow({
        merchant: mer.merchant,
        totalAmount: mer.totalAmount,
        visitCount: mer.visitCount,
      });
    });
    merchantSheet.getRow(1).font = { bold: true };

    // 5. Sheet: Budgets
    const budgetSheet = workbook.addWorksheet('Budgets');
    budgetSheet.columns = [
      { header: 'Budget Name', key: 'name', width: 22 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Limit ($)', key: 'monthlyLimit', width: 15 },
      { header: 'Spent ($)', key: 'spent', width: 15 },
      { header: 'Remaining ($)', key: 'remaining', width: 15 },
      { header: 'Usage (%)', key: 'usage', width: 15 },
      { header: 'Alert Level', key: 'alertLevel', width: 15 },
    ];
    budgets.forEach((b) => {
      budgetSheet.addRow({
        name: b.name,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spent: b.usage?.spent || 0,
        remaining: b.usage?.remaining || 0,
        usage: `${b.usage?.usagePercent || 0}%`,
        alertLevel: b.usage?.alertLevel || 'safe',
      });
    });
    budgetSheet.getRow(1).font = { bold: true };

    // 6. Sheet: Forecast
    if (forecast) {
      const forecastSheet = workbook.addWorksheet('Forecast');
      forecastSheet.columns = [
        { header: 'Forecast Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 25 },
      ];
      forecastSheet.addRows([
        { metric: 'Current Month Spent ($)', value: forecast.currentMonthSpent },
        { metric: 'Projected Month-End Spend ($)', value: forecast.projectedMonthEndTotal },
        { metric: 'Daily Burn Rate ($)', value: forecast.dailyBurnRate },
        { metric: 'Days Elapsed', value: forecast.daysElapsedInMonth },
        { metric: 'Days Remaining', value: forecast.daysRemainingInMonth },
        { metric: 'Savings Potential ($)', value: forecast.savingsPotential },
      ]);
      forecastSheet.getRow(1).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
