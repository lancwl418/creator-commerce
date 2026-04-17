import type { ProductTemplate } from '@/types/product';

export type EditorMode = 'embedded' | 'standalone' | 'demo' | 'portal';

export interface EditorConfig {
  mode: EditorMode;
  /** Embedded mode: the single product template to edit */
  template?: ProductTemplate;
  /** Standalone mode: API endpoint that returns ProductTemplate[] */
  apiEndpoint?: string;
  /** Standalone mode: optional auth headers for API requests */
  apiHeaders?: Record<string, string>;
  /** Portal mode: pre-selected product IDs from Portal (comma-separated) */
  portalTemplateIds?: string[];
  /** Portal mode: cache key to fetch product data from Portal API (avoids URL length limits) */
  productsCacheKey?: string;
  /** Portal mode: Portal API URL for products-cache endpoint */
  productsCacheUrl?: string;
  /** Portal mode: artwork URL to auto-add as layer */
  artworkUrl?: string;
  /** Portal mode: design ID from Portal */
  designId?: string;
  /** Portal mode: pre-selected color from catalog page */
  selectedColor?: string;
  /** Callback when user saves the design */
  onSave?: (designJson: string) => void;
  /** Callback when user exports the design */
  onExport?: (designJson: string, pngDataUrl?: string) => void;
}
