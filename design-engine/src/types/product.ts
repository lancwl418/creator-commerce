/** Built-in product types. External templates may use any string value. */
export type BuiltinProductType = 'tshirt' | 'mug' | 'phonecase';
export type ProductType = BuiltinProductType | (string & {});

export interface ProductView {
  id: string;
  label: string;
  mockupImageUrl: string;
  mockupWidth: number;
  mockupHeight: number;
  printableArea: PrintableArea;
}

export interface PrintableArea {
  shape: PrintableAreaShape;
  /** Position of printable area top-left relative to mockup (px) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Physical print dimensions for DPI calculation */
  physicalWidthInches: number;
  physicalHeightInches: number;
  minDPI: number;
}

export type PrintableAreaShape =
  | { type: 'rect'; borderRadius?: number }
  | { type: 'ellipse' }
  | { type: 'polygon'; points: Array<{ x: number; y: number }> };

export interface ProductTemplate {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  views: ProductView[];
  defaultViewId: string;
  metadata: Record<string, unknown>;
}
