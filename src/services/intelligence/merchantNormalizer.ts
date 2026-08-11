export interface NormalizedMerchantResult {
  rawName: string;
  normalizedName: string;
  merchantType: string;
  confidence: number;
}

export class MerchantNormalizer {
  private static knownMerchants: Record<string, { name: string; type: string }> = {
    amazon: { name: 'Amazon', type: 'E-Commerce Marketplace' },
    amzn: { name: 'Amazon', type: 'E-Commerce Marketplace' },
    starbucks: { name: 'Starbucks', type: 'Coffee Shop & Cafe' },
    swiggy: { name: 'Swiggy', type: 'Food Delivery' },
    zomato: { name: 'Zomato', type: 'Food Delivery' },
    uber: { name: 'Uber', type: 'Rideshare & Transportation' },
    lyft: { name: 'Lyft', type: 'Rideshare & Transportation' },
    walmart: { name: 'Walmart', type: 'Supermarket & Retail' },
    target: { name: 'Target', type: 'Department Store' },
    apple: { name: 'Apple Store', type: 'Consumer Electronics' },
    netflix: { name: 'Netflix', type: 'Digital Streaming Subscription' },
    spotify: { name: 'Spotify', type: 'Digital Audio Subscription' },
    mcdonalds: { name: "McDonald's", type: 'Fast Food Restaurant' },
    shell: { name: 'Shell Oil', type: 'Gas & Fuel Station' },
    chevron: { name: 'Chevron', type: 'Gas & Fuel Station' },
  };

  public static normalize(rawName: string): NormalizedMerchantResult {
    if (!rawName || !rawName.trim()) {
      return {
        rawName: rawName || '',
        normalizedName: 'Unknown Merchant',
        merchantType: 'General Merchant',
        confidence: 0.5,
      };
    }

    const clean = rawName
      .trim()
      .replace(/\s+#\d+/g, '') // remove store numbers like #193
      .replace(/\b(mktp|online|store|inc|ltd|co|corp|llc)\b/gi, '') // remove corporate suffixes
      .replace(/[^a-zA-Z0-9\s]/g, '') // remove punctuation
      .replace(/\s+/g, ' ')
      .trim();

    const lowerClean = clean.toLowerCase();

    // Check known merchant lookup map
    for (const [key, info] of Object.entries(this.knownMerchants)) {
      if (lowerClean.includes(key)) {
        return {
          rawName,
          normalizedName: info.name,
          merchantType: info.type,
          confidence: 0.98,
        };
      }
    }

    // Capitalize words for clean normalized name
    const titleCased = clean
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const finalName = titleCased.length > 0 ? titleCased : rawName.trim();

    return {
      rawName,
      normalizedName: finalName,
      merchantType: 'General Merchant',
      confidence: 0.88,
    };
  }
}
