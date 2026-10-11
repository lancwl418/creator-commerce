import { createClient } from '@/lib/supabase/client';
import type { CnOrderStatus } from '@/lib/types/cn-order';

/** 确认 / 取消采购单。写入权限由 RLS 的 cn_bulk_orders_admin_update 控制。 */
export async function updateCnOrderStatus(orderId: string, status: Exclude<CnOrderStatus, 'pending_confirmation'>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cn_bulk_orders')
    .update({ status, confirmed_at: status === 'confirmed' ? new Date().toISOString() : null })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}
