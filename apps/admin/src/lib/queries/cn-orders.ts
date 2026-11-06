import { createClient } from '@/lib/supabase/server';
import type { CnOrderRow, CnOrderStatus } from '@/lib/types/cn-order';

const PAGE_SIZE = 100;
const STATUSES: CnOrderStatus[] = ['pending_confirmation', 'confirmed', 'cancelled'];

export function parseCnOrderStatus(value: string | undefined): CnOrderStatus | null {
  return STATUSES.includes(value as CnOrderStatus) ? (value as CnOrderStatus) : null;
}

const ORDER_COLUMNS =
  'id, order_number, order_type, status, erp_product_id, product_title, items, subtotal, currency, shipping_address, note, design_files, faces, erp_order_id, push_suppliers, confirmed_at, created_at, creators (id, email, company_name, contact_name, phone)';

/** 中国卖家的采购单，最新在前；可按状态筛选。 */
export async function getCnOrders(status: CnOrderStatus | null): Promise<CnOrderRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cn_bulk_orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.returns<CnOrderRow[]>();
  if (error) throw new Error(`Failed to load CN orders: ${error.message}`);
  return data ?? [];
}

/** 单张采购单详情 */
export async function getCnOrder(orderId: string): Promise<CnOrderRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_bulk_orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .maybeSingle<CnOrderRow>();
  if (error) throw new Error(`Failed to load CN order: ${error.message}`);
  return data;
}
