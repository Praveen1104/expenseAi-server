import { ExpenseCategory } from '../../constants/expense.constants.js';

export interface CategoryClassificationResult {
  category: ExpenseCategory;
  confidence: number;
}

export class CategoryClassifier {
  private static categoryKeywords: Record<ExpenseCategory, string[]> = {
    Food: ['cafe', 'coffee', 'restaurant', 'bistro', 'diner', 'burger', 'pizza', 'swiggy', 'zomato', 'bakery', 'starbucks', 'mcdonalds'],
    Groceries: ['supermarket', 'mart', 'grocery', 'whole foods', 'trader joe', 'walmart', 'food hall', 'fresh', 'vegetable'],
    Shopping: ['amazon', 'target', 'apparel', 'clothing', 'electronics', 'apple store', 'mall', 'fashion', 'store'],
    Transportation: ['uber', 'lyft', 'taxi', 'cab', 'transit', 'metro', 'subway', 'bus', 'train', 'flight'],
    Fuel: ['gas', 'fuel', 'petrol', 'shell', 'chevron', 'exxon', 'bp', 'station'],
    Travel: ['hotel', 'airbnb', 'flight', 'airline', 'resort', 'vacation', 'trip', 'booking'],
    Entertainment: ['netflix', 'spotify', 'cinema', 'movie', 'theater', 'gaming', 'steam', 'concert', 'ticket'],
    Healthcare: ['pharmacy', 'hospital', 'doctor', 'clinic', 'medical', 'cvs', 'walgreens', 'dental', 'health'],
    Education: ['bookstore', 'course', 'udemy', 'coursera', 'university', 'tuition', 'school', 'academy'],
    Utilities: ['electric', 'power', 'water', 'gas utility', 'sewer', 'trash'],
    Bills: ['mobile', 'internet', 'broadband', 'telecom', 'insurance', 'rent'],
    Salary: ['payroll', 'salary', 'stipend', 'wages'],
    Investment: ['stocks', 'crypto', 'brokerage', 'fund', 'mutual fund'],
    Others: [],
  };

  public static classify(merchant: string, title: string, notes?: string): CategoryClassificationResult {
    const text = `${merchant} ${title} ${notes || ''}`.toLowerCase();

    for (const [cat, keywords] of Object.entries(this.categoryKeywords)) {
      if (cat === 'Others') continue;
      for (const kw of keywords) {
        if (text.includes(kw)) {
          return {
            category: cat as ExpenseCategory,
            confidence: 0.95,
          };
        }
      }
    }

    // Default fallback
    return {
      category: 'Others',
      confidence: 0.75,
    };
  }
}
