export interface DesignForProduct {
  id: string;
  title: string;
  current_version_id: string | null;
  design_versions: {
    id: string;
    version_number: number;
    design_assets: { id: string; asset_type: string; file_url: string }[];
  }[];
}

export interface ExternalProduct {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  source: 'shopify' | 'erp';
  base_cost: number | null;
  product_name: string;
}

export type ProductSourceFilter = 'all' | ExternalProduct['source'];

export interface ShopifyTemplateProduct {
  id: string | number;
  title: string;
  body_html?: string | null;
  images?: { src: string }[];
  image?: { src: string } | null;
  variants?: { price?: string | number | null }[];
}
