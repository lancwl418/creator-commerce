export interface ErpSku {
  id: string;
  sku: string;
  price: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inQty: number;
  skuImage: string | null;
}

export interface SkuSelection {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  enabled: boolean;
  price?: number | null;
  erpPrice?: number | null;
  skuImage?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  rawPath: string;
  isMain: boolean;
}

export interface ProductData {
  id: string;
  title: string;
  description: string;
  status: string;
  cost: number;
  retail_price: number | null;
  selected_skus: SkuSelection[];
  design_id: string;
  design_version_id: string;
  product_template_id: string;
  base_price_suggestion: number | null;
  variant_preview_urls: Record<string, string> | null;
  product_images: ProductImage[];
  created_at: string;
}

export interface Listing {
  id: string;
  channel_type: string;
  creator_store_connection_id?: string;
  external_listing_url?: string;
  price: number;
  currency: string;
  status: string;
  error_message?: string;
  creator_store_connections?: { platform: string; store_name: string | null };
}
