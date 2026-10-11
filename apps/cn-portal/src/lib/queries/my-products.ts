import { createClient } from '../supabase/server';
import type { MyProductDetailRow, MyProductRow } from '../types/product';

/** 卖家已建的产品及其店铺 listing；与 Creator Portal 共用 sellable_product_instances。 */
export async function getMyProducts(creatorId: string): Promise<MyProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sellable_product_instances')
    .select('id, title, status, retail_price, product_images, created_at, channel_listings (id, status, external_listing_url, creator_store_connections (store_name))')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .returns<MyProductRow[]>();
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return data ?? [];
}

export async function getConnectedShopifyStore(creatorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('creator_store_connections')
    .select('id, store_name, store_url, status')
    .eq('creator_id', creatorId)
    .eq('platform', 'shopify')
    .eq('status', 'connected')
    .maybeSingle<{ id: string; store_name: string | null; store_url: string | null; status: string }>();
  if (error) throw new Error(`Failed to load store connection: ${error.message}`);
  return data;
}

/** 单个产品记录（用于设计后的同步页） */
export async function getMyProduct(creatorId: string, productId: string): Promise<MyProductDetailRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sellable_product_instances')
    .select('id, title, description, status, retail_price, base_price_suggestion, product_template_id, preview_urls, design_artwork_urls')
    .eq('creator_id', creatorId)
    .eq('id', productId)
    .maybeSingle<MyProductDetailRow>();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data;
}
