import { BaseRepository } from './base.repository.js';
import { MerchantModel, IMerchant, RecurringFrequency } from '../models/merchant.model.js';

export class MerchantRepository extends BaseRepository<IMerchant> {
  constructor() {
    super(MerchantModel);
  }

  public async findByNormalizedName(normalizedName: string): Promise<IMerchant | null> {
    return this.model.findOne({ normalizedName }).exec();
  }

  public async recordVisit(
    rawName: string,
    normalizedName: string,
    merchantType: string,
    category: string,
    amount: number,
    isRecurring: boolean,
    recurringFrequency: RecurringFrequency
  ): Promise<IMerchant> {
    const existing = await this.findByNormalizedName(normalizedName);

    if (existing) {
      const newVisitCount = existing.visitCount + 1;
      const newTotalSpend = existing.totalSpend + amount;
      const newAvgSpend = newTotalSpend / newVisitCount;
      const categoriesSet = new Set([...existing.categories, category]);

      existing.visitCount = newVisitCount;
      existing.totalSpend = Math.round(newTotalSpend * 100) / 100;
      existing.averageSpend = Math.round(newAvgSpend * 100) / 100;
      existing.lastVisit = new Date();
      existing.categories = Array.from(categoriesSet);
      if (isRecurring) {
        existing.isRecurring = true;
        existing.recurringFrequency = recurringFrequency;
      }

      return existing.save();
    }

    return this.model.create({
      merchantName: rawName,
      normalizedName,
      merchantType,
      categories: [category],
      visitCount: 1,
      totalSpend: amount,
      averageSpend: amount,
      lastVisit: new Date(),
      isRecurring,
      recurringFrequency,
    });
  }

  public async findMerchantsPaginated(
    page = 1,
    limit = 10
  ): Promise<{ data: IMerchant[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.find().sort({ totalSpend: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments().exec(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return { data, total, pages };
  }
}

export const merchantRepository = new MerchantRepository();
