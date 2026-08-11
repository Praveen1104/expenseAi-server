import { Document, Model } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  public async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  public async findAll(): Promise<T[]> {
    return this.model.find().exec();
  }

  public async create(item: Partial<T>): Promise<T> {
    return this.model.create(item);
  }

  public async update(id: string, item: Partial<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, item, { new: true }).exec();
  }

  public async findByIdAndUser(id: string, userId: string): Promise<T | null> {
    return this.model.findOne({ _id: id, userId } as any).exec();
  }

  public async updateByUser(id: string, item: Partial<T>, userId: string): Promise<T | null> {
    return this.model.findOneAndUpdate({ _id: id, userId } as any, item, { new: true }).exec();
  }

  public async deleteByUser(id: string, userId: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({ _id: id, userId } as any).exec();
    return result !== null;
  }
}
