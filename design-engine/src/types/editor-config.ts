import type { ProductTemplate } from '@/types/product';
import type { ErpProduct } from '@/types/erp-product';

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
  /** Portal mode: raw ERP product data passed from Portal (skips ERP fetch) */
  portalProducts?: ErpProduct[];
  /** Portal mode: artwork URL to auto-add as layer */
  artworkUrl?: string;
  /** Portal mode: design ID from Portal */
  designId?: string;
  /** Callback when user saves the design */
  onSave?: (designJson: string) => void;
  /** Callback when user exports the design */
  onExport?: (designJson: string, pngDataUrl?: string) => void;
}
