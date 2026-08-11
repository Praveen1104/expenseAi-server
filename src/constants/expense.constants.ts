export const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Transportation',
  'Fuel',
  'Entertainment',
  'Healthcare',
  'Education',
  'Utilities',
  'Bills',
  'Groceries',
  'Salary',
  'Investment',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Bank Transfer',
  'Wallet',
  'Other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
