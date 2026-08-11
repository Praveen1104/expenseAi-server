import { ReceiptExtractionPayload } from '../../validators/ocr.validator.js';
import { CreateExpenseInput } from '../../validators/expense.validator.js';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, ExpenseCategory, PaymentMethod } from '../../constants/expense.constants.js';

export class ExtractionMapper {
  public static toExpenseInput(extracted: ReceiptExtractionPayload, receiptFileName: string): CreateExpenseInput {
    // Map or fallback category
    let category: ExpenseCategory = 'Others';
    if (extracted.categorySuggestion?.value) {
      const matched = EXPENSE_CATEGORIES.find(
        (c) => c.toLowerCase() === extracted.categorySuggestion?.value.toLowerCase()
      );
      if (matched) category = matched;
    }

    // Map or fallback payment method
    let paymentMethod: PaymentMethod = 'Credit Card';
    if (extracted.paymentMethod?.value) {
      const matched = PAYMENT_METHODS.find(
        (p) => p.toLowerCase() === extracted.paymentMethod?.value.toLowerCase()
      );
      if (matched) paymentMethod = matched;
    }

    // Parse transaction date safely
    let transactionDate = new Date();
    if (extracted.transactionDate?.value) {
      const parsed = new Date(extracted.transactionDate.value);
      if (!isNaN(parsed.getTime())) {
        transactionDate = parsed;
      }
    }

    // Map line item names to tags
    const lineItemTags = extracted.lineItems
      ? extracted.lineItems.map((item: any) => item.name.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
      : [];
    const tags = Array.from(new Set(['ai-scanned', ...lineItemTags])).slice(0, 5);

    const title = `${extracted.merchant.value} Receipt`;
    const notes = `Auto-extracted via AI Vision OCR from file "${receiptFileName}". Items scanned: ${extracted.lineItems.length}`;

    return {
      title,
      merchant: extracted.merchant.value,
      category,
      amount: extracted.grandTotal.value,
      currency: extracted.currency.value || 'USD',
      paymentMethod,
      transactionDate,
      notes,
      tags,
    };
  }
}
