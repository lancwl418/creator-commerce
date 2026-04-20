import { createClient } from '@/lib/supabase/server';

export async function getOrders(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('creator_orders')
    .select(`
      *,
      creator_store_connections (id, platform, store_name, store_url),
      creator_order_items (id, title, variant_title, quantity, unit_price, total_price, earnings_amount)
    `)
    .eq('creator_id', creatorId)
    .order('order_placed_at', { ascending: false })
    .limit(100);

  return data || [];
}

export async function getOrderById(orderId: string, creatorId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('creator_orders')
    .select(`
      *,
      creator_store_connections (id, platform, store_name, store_url),
      creator_order_logs (id, action, source, changes, note, created_by, created_at),
      creator_order_fulfillments (id, tracking_number, tracking_url, carrier, status, fulfilled_at),
      creator_order_items (
        id, title, variant_title, sku, quantity,
        unit_price, total_price, sale_price_snapshot,
        base_cost_snapshot, earnings_amount,
        shopify_product_id, shopify_variant_id,
        shopify_line_item_id,
        channel_listing_variant_id,
        channel_listing_variants (
          id, external_variant_id,
          custom_product_skus (
            id, erp_product_id, erp_sku_id, sku_code,
            erp_synced_sku_id, erp_sync_status, preview_image_url
          )
        )
      )
    `)
    .eq('id', orderId);

  if (creatorId) query = query.eq('creator_id', creatorId);

  const { data } = await query.single();

  return data;
}
