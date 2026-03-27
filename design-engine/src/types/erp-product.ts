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
