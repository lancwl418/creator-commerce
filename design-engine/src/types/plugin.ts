import type { ComponentType } from 'react';
import type { DesignDocument } from './design';
import type { ProductTemplate } from './product';

export interface IdeamizerPlugin {
  id: string;
  name: string;
  version: string;
  platform: 'shopify' | 'etsy' | 'custom';
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
  hooks: PluginHooks;
}

export interface PluginContext {
  getDesignDocument(): DesignDocument;
  getProductTemplate(): ProductTemplate;
  registerUIExtension(point: UIExtensionPoint, component: ComponentType): void;
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (payload: unknown) => void): () => void;
}

export interface PluginHooks {
  beforeExport?(design: DesignDocument): Promise<DesignDocument>;
  afterExport?(result: ExportResult): Promise<void>;
  validateDesign?(design: DesignDocument): Promise<ValidationResult[]>;
  mapProduct?(template: ProductTemplate): Promise<PlatformProduct>;
}

export interface UIExtensionPoint {
  location: 'toolbar' | 'sidebar' | 'menu' | 'export-dialog';
  priority: number;
}

export interface ExportResult {
  success: boolean;
  platformId?: string;
  platformUrl?: string;
  error?: string;
}

export interface ValidationResult {
  level: 'error' | 'warning' | 'info';
  message: string;
  layerId?: string;
}

export interface PlatformProduct {
  platformId: string;
  title: string;
  description: string;
  tags: string[];
  images: string[];
  variants: PlatformVariant[];
}

export interface PlatformVariant {
  title: string;
  price: number;
  sku: string;
  options: Record<string, string>;
}
