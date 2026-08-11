export interface RawVisionResponse {
  rawJson: Record<string, unknown>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTimeMs: number;
  model: string;
  provider: string;
}

export interface IVisionProvider {
  extractReceiptData(imageBuffer: Buffer, mimeType: string, fileName?: string): Promise<RawVisionResponse>;
}
