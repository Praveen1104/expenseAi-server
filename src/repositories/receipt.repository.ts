import { BaseRepository } from './base.repository.js';
import { ReceiptModel, IReceipt, ReceiptStatus } from '../models/receipt.model.js';
import { FilterQuery } from 'mongoose';

export class ReceiptRepository extends BaseRepository<IReceipt> {
  constructor() {
    super(ReceiptModel);
  }

  public async findByHash(fileHash: string, userId: string): Promise<IReceipt | null> {
    return this.model.findOne({ fileHash, userId }).exec();
  }

  public async findReceiptsPaginated(
    page = 1,
    limit = 10,
    status?: ReceiptStatus,
    userId?: string
  ): Promise<{ data: IReceipt[]; total: number; pages: number }> {
    const filter: FilterQuery<IReceipt> = {};
    if (status) {
      filter.status = status;
    }
    if (userId) {
      filter.userId = userId as any;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return { data, total, pages };
  }

  public async updateStatus(
    id: string,
    status: ReceiptStatus,
    errorMessage?: string
  ): Promise<IReceipt | null> {
    const updatePayload: Partial<IReceipt> = { status };
    if (errorMessage !== undefined) {
      updatePayload.errorMessage = errorMessage;
    }
    if (status === 'PROCESSING') {
      updatePayload.processingStartedAt = new Date();
    } else if (status === 'COMPLETED' || status === 'FAILED') {
      updatePayload.processingCompletedAt = new Date();
    }

    return this.model.findByIdAndUpdate(id, updatePayload, { new: true }).exec();
  }
}

export const receiptRepository = new ReceiptRepository();
