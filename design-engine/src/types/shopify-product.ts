/** Shopify 商品变体 */
export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  barcode: string | null;
  inventory_quantity: number;
  weight: number;
  weight_unit: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_id: number | null;
}

/** Shopify 商品图片 */
export interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
  position: number;
  width: number;
  height: number;
}

/** Shopify 商品 */
export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  tags: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  image: ShopifyImage | null;
}

/** Shopify API 产品列表响应 */
export interface ShopifyProductListResponse {
  products: ShopifyProduct[];
  nextPageInfo: string | null;
  prevPageInfo: string | null;
}
