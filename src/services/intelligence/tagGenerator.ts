export class TagGenerator {
  public static generateTags(
    merchant: string,
    category: string,
    title: string,
    existingTags: string[] = []
  ): { tags: string[]; confidence: number } {
    const text = `${merchant} ${category} ${title} ${existingTags.join(' ')}`.toLowerCase();
    const tagSet = new Set<string>(existingTags.map((t) => t.toLowerCase().trim()));

    if (text.includes('coffee') || text.includes('starbucks') || text.includes('cafe')) {
      tagSet.add('Coffee');
    }
    if (text.includes('office') || text.includes('desk') || text.includes('client')) {
      tagSet.add('Office');
    }
    if (text.includes('apple') || text.includes('electronic') || text.includes('device')) {
      tagSet.add('Electronics');
    }
    if (text.includes('book') || text.includes('education') || text.includes('course')) {
      tagSet.add('Books');
    }
    if (text.includes('pharmacy') || text.includes('medical') || text.includes('health')) {
      tagSet.add('Medical');
    }
    if (text.includes('hotel') || text.includes('flight') || text.includes('vacation')) {
      tagSet.add('Vacation');
    }
    if (text.includes('subscrip') || text.includes('netflix') || text.includes('spotify')) {
      tagSet.add('Subscription');
    }
    if (text.includes('gym') || text.includes('fitness') || text.includes('workout')) {
      tagSet.add('Fitness');
    }

    // Default tag addition based on category
    tagSet.add(category.toLowerCase());

    const finalTags = Array.from(tagSet).map(
      (t) => t.charAt(0).toUpperCase() + t.slice(1)
    );

    return {
      tags: finalTags,
      confidence: 0.92,
    };
  }
}
