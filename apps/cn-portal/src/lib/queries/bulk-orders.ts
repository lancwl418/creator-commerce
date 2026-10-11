import { createClient } from '../supabase/server';
import type { BulkOrderRow, ShippingAddress } from '../types/bulk-order';

const BULK_ORDER_COLUMNS = 'id, order_type, status, erp_product_id, product_title, items, subtotal, currency, shipping_address, note, design_files, faces, confirmed_at, created_at';

export async function getBulkOrders(creatorId: string): Promise<BulkOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_bulk_orders')
    .select(BULK_ORDER_COLUMNS)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<BulkOrderRow[]>();
  if (error) throw new Error(`Failed to load bulk orders: ${error.message}`);
  return data ?? [];
}

export async function getBulkOrder(creatorId: string, orderId: string): Promise<BulkOrderRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_bulk_orders')
    .select(BULK_ORDER_COLUMNS)
    .eq('creator_id', creatorId)
    .eq('id', orderId)
    .maybeSingle<BulkOrderRow>();
  if (error) throw new Error(`Failed to load bulk order: ${error.message}`);
  return data;
}

/** 上一次下单用的收货地址，用来预填表单 */
export async function getLastShippingAddress(creatorId: string): Promise<ShippingAddress | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cn_bulk_orders')
    .select('shipping_address')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ shipping_address: ShippingAddress }>();
  return data?.shipping_address ?? null;
}
