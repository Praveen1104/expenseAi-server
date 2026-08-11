import { MerchantNormalizer } from '../src/services/intelligence/merchantNormalizer';
import { CategoryClassifier } from '../src/services/intelligence/categoryClassifier';
import { TagGenerator } from '../src/services/intelligence/tagGenerator';
import { RecurringDetector } from '../src/services/intelligence/recurringDetector';

describe('AI Intelligence Engine Unit Tests', () => {
  describe('MerchantNormalizer', () => {
    it('should normalize messy merchant names into clean standardized names', () => {
      const res1 = MerchantNormalizer.normalize('AMZN Mktp IN');
      expect(res1.normalizedName).toBe('Amazon');

      const res2 = MerchantNormalizer.normalize('STARBUCKS #193');
      expect(res2.normalizedName).toBe('Starbucks');

      const res3 = MerchantNormalizer.normalize('SWIGGY ONLINE');
      expect(res3.normalizedName).toBe('Swiggy');
    });
  });

  describe('CategoryClassifier', () => {
    it('should classify keywords into correct categories', () => {
      const res1 = CategoryClassifier.classify('Starbucks', 'Coffee & Muffin');
      expect(res1.category).toBe('Food');

      const res2 = CategoryClassifier.classify('Uber', 'Ride to Airport');
      expect(res2.category).toBe('Transportation');

      const res3 = CategoryClassifier.classify('Netflix', 'Monthly Premium');
      expect(res3.category).toBe('Entertainment');
    });
  });

  describe('TagGenerator', () => {
    it('should generate multi-label tags based on merchant and text', () => {
      const res = TagGenerator.generateTags('Starbucks', 'Food', 'Client Morning Coffee');
      expect(res.tags).toContain('Coffee');
      expect(res.tags).toContain('Office');
    });
  });

  describe('RecurringDetector', () => {
    it('should detect subscriptions and recurring merchant visits', () => {
      const subRes = RecurringDetector.detect('Netflix Inc', 1);
      expect(subRes.isRecurring).toBe(true);
      expect(subRes.frequency).toBe('Subscription');

      const regRes = RecurringDetector.detect('Local Supermarket', 3, [
        new Date('2026-07-01'),
        new Date('2026-07-08'),
        new Date('2026-07-15'),
      ]);
      expect(regRes.isRecurring).toBe(true);
      expect(regRes.frequency).toBe('Weekly');
    });
  });
});
