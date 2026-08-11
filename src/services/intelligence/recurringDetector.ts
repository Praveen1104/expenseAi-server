import { RecurringFrequency } from '../../models/merchant.model.js';

export interface RecurringDetectionResult {
  isRecurring: boolean;
  frequency: RecurringFrequency;
  confidence: number;
}

export class RecurringDetector {
  public static detect(
    merchantName: string,
    visitCount: number,
    previousDates: Date[] = []
  ): RecurringDetectionResult {
    const text = merchantName.toLowerCase();

    // Check explicit subscription keywords
    if (
      text.includes('netflix') ||
      text.includes('spotify') ||
      text.includes('prime') ||
      text.includes('subscrip') ||
      text.includes('cloud') ||
      text.includes('icloud')
    ) {
      return {
        isRecurring: true,
        frequency: 'Subscription',
        confidence: 0.98,
      };
    }

    if (visitCount >= 3 && previousDates.length >= 2) {
      // Calculate average interval in days
      const sorted = [...previousDates].sort((a, b) => a.getTime() - b.getTime());
      const intervals: number[] = [];

      for (let i = 1; i < sorted.length; i++) {
        const diffDays = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 3600 * 24);
        intervals.push(diffDays);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      if (avgInterval >= 25 && avgInterval <= 35) {
        return { isRecurring: true, frequency: 'Monthly', confidence: 0.94 };
      }
      if (avgInterval >= 6 && avgInterval <= 8) {
        return { isRecurring: true, frequency: 'Weekly', confidence: 0.92 };
      }
      if (avgInterval >= 0.8 && avgInterval <= 1.5) {
        return { isRecurring: true, frequency: 'Daily', confidence: 0.95 };
      }

      return { isRecurring: true, frequency: 'Regular', confidence: 0.85 };
    }

    if (visitCount >= 2) {
      return { isRecurring: true, frequency: 'Regular', confidence: 0.80 };
    }

    return { isRecurring: false, frequency: 'None', confidence: 0.90 };
  }
}
