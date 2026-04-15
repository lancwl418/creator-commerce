/** ERP 商品 SKU 变体 */
export interface ErpProductSku {
  id: string;
  sku: string;
  barcode: string;
  price: number;
  compareAtPrice: number | null;
  inQty: number;
  weight: number;
  weightUnit: string;
  option1: string;
  option2: string;
  option3: string;
  skuImage: string;
  itemNo: string;
}

/** ERP 商品图片 */
export interface ErpProductImage {
  id: string;
  picSrc: string;
  isMain: number;
  position: number;
  altText: string;
  itemNo: string;
}

/**
 * Print template setup data, populated by ERP operators via the
 * /embed/template-setup tool. When present, the editor uses these mockup
 * images and printable areas verbatim instead of falling back to defaults.
 */
export interface ErpPrintTemplate {
  views: import('./product').ProductView[];
  productRects: Record<string, {
    x: number; y: number; w: number; h: number;
    physicalW: number; physicalH: number;
  }>;
}

/** ERP 商品 */
export interface ErpProduct {
  id: string;
  itemCnName: string;
  itemEnName: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  status: number;
  tags: string;
  itemNo: string;
  mainPic: string;
  prodSkuList: ErpProductSku[];
  prodImageList: ErpProductImage[];
  /** Optional: print-area template configured via the ERP embed tool. */
  printTemplate?: ErpPrintTemplate;
}

/** ERP API 分页响应 */
export interface ErpProductListResponse {
  success: boolean;
  message: string;
  code: number;
  result: {
    records: ErpProduct[];
    total: number;
    size: number;
    current: number;
    pages: number;
  };
}
