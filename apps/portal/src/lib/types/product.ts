import type { ErpSku } from '@creator-commerce/shared/erp/types';
export type { ErpSku } from '@creator-commerce/shared/erp/types';

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
  shipping_cost: number | null;
  tags: string[] | null;
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

export interface ProductListItem {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  retail_price: number | null;
  preview_urls: unknown;
  design_artwork_urls: unknown;
  designs: { id: string; title: string | null } | null;
  channel_listings: Listing[] | null;
}

export interface ProductsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export type WizardStep = 'product' | 'design' | 'detail' | 'price';

export interface ProductVariantsResponse {
  skus: ErpSku[];
  option_names: string[];
}

export interface ProductDraftInput {
  erpSkus: ErpSku[];
  enabledSkuIds: Set<string>;
  variantPrices: Record<string, string>;
  optionNames: string[];
  title: string;
  description: string;
  tags: string[];
  selectedImageIds: Set<string>;
  retailPrice: number;
  shippingCost: number;
  costMin: number | null;
}
