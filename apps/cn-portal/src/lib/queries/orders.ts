import { createClient } from '../supabase/server';
import type { SellerOrderRow } from '../types/order';

const ORDERS_LIMIT = 100;

/** 卖家店铺回流的订单，最新在前；与 Creator Portal 共用 creator_orders。 */
export async function getSellerOrders(creatorId: string): Promise<SellerOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('creator_orders')
    .select(`
      id, shopify_order_name, shopify_order_number, financial_status, fulfillment_status,
      total_price, currency, customer_name, order_placed_at, created_at,
      creator_store_connections (store_name),
      creator_order_items (id, title, variant_title, quantity)
    `)
    .eq('creator_id', creatorId)
    .order('order_placed_at', { ascending: false, nullsFirst: false })
    .limit(ORDERS_LIMIT)
    .returns<SellerOrderRow[]>();
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data ?? [];
}
