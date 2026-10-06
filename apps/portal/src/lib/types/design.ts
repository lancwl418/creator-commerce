export interface DesignUploadInput {
  title: string;
  description: string;
  tags: string;
  file: File;
  dimensions: { width: number; height: number };
}

export type PromotionPricingMode = 'custom' | 'ideamax';
export type PromotionStep = 'closed' | 'preview' | 'form' | 'agreement';
