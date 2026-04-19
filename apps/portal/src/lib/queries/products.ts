import { createClient } from '@/lib/supabase/server';

export async function getProducts(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sellable_product_instances')
    .select(`
      *,
      designs (id, title),
      channel_listings (id, channel_type, creator_store_connection_id, status, price, currency, creator_store_connections (platform))
    `)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getProductById(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sellable_product_instances')
    .select(`
      *,
      designs (id, title, status),
      product_configurations (id, layers, finalized_at),
      channel_listings (id, channel_type, creator_store_connection_id, external_listing_url, price, currency, status, published_at, error_message, creator_store_connections (platform, store_name))
    `)
    .eq('id', productId)
    .single();

  return data;
}

export async function getProductArtwork(designVersionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('design_assets')
    .select('file_url')
    .eq('design_version_id', designVersionId)
    .eq('asset_type', 'artwork')
    .single();

  return data?.file_url ?? null;
}
