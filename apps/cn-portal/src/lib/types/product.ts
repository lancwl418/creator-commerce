import type { SkuSelection } from '@creator-commerce/shared/shopify/listing-prices';

/** 可以「仅同步白板」的一个 variant：可上架、且该等级有空白件售价 */
export interface BlankVariant {
  skuId: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  skuImage: string | null;
  /** 空白件成本（该等级的空白件售价） */
  cost: number;
}

export interface BlankProductImage {
  id: string;
  /** ERP 原始路径 */
  rawPath: string;
  isMain: boolean;
}

/** 同步白板表单解析后的输入 */
export interface BlankProductInput {
  title: string;
  description: string;
  retailPrice: number;
  /** 单个 variant 的售价覆盖，key 为 skuId */
  variantPrices: Record<string, number>;
  enabledSkuIds: string[];
  selectedImageIds: string[];
  publishStatus: 'active' | 'draft';
}

/** 写入 sellable_product_instances 的行 */
export interface BlankProductRow {
  creator_id: string;
  product_template_id: string;
  erp_product_id: string;
  title: string;
  description: string;
  status: 'ready';
  selected_skus: SkuSelection[];
  option_names: string[];
  product_images: { id: string; url: string; rawPath: string; isMain: boolean }[];
  retail_price: number;
  cost: number;
  preview_urls: string[];
  design_artwork_urls: string[];
}

export interface BlankSyncFormState {
  error?: string;
}

export interface SyncPageProps {
  params: Promise<{ id: string }>;
}

/** 我的产品列表里的一行 */
export interface MyProductRow {
  id: string;
  title: string | null;
  status: string;
  retail_price: number | null;
  product_images: { rawPath?: string; url?: string }[] | null;
  created_at: string;
  channel_listings: { id: string; status: string; external_listing_url: string | null; creator_store_connections: { store_name: string | null } | null }[] | null;
}

export interface MyProductsPageProps {
  searchParams: Promise<{ synced?: string | string[] }>;
}
