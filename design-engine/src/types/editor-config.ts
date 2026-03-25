import type { ProductTemplate } from '@/types/product';

export type EditorMode = 'embedded' | 'standalone' | 'demo';

export interface EditorConfig {
  mode: EditorMode;
  /** Embedded mode: the single product template to edit */
  template?: ProductTemplate;
  /** Standalone mode: API endpoint that returns ProductTemplate[] */
  apiEndpoint?: string;
  /** Standalone mode: optional auth headers for API requests */
  apiHeaders?: Record<string, string>;
  /** Callback when user saves the design */
  onSave?: (designJson: string) => void;
  /** Callback when user exports the design */
  onExport?: (designJson: string, pngDataUrl?: string) => void;
}
