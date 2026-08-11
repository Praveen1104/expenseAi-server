import { ConfidenceScores } from '../../models/expense.model.js';

export class ConfidenceService {
  public static computeScores(
    merchantConf: number,
    categoryConf: number,
    tagsConf: number
  ): ConfidenceScores {
    const summaryConf = (merchantConf + categoryConf + tagsConf) / 3;

    return {
      merchant: Math.round(merchantConf * 100) / 100,
      category: Math.round(categoryConf * 100) / 100,
      tags: Math.round(tagsConf * 100) / 100,
      summary: Math.round(summaryConf * 100) / 100,
    };
  }
}
