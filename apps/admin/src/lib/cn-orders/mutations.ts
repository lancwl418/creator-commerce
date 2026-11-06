import { createClient } from '@/lib/supabase/client';
import type { CnOrderStatus, PushSupplierSelection } from '@/lib/types/cn-order';

/** 确认 / 取消采购单。写入权限由 RLS 的 cn_bulk_orders_admin_update 控制。 */
export async function updateCnOrderStatus(orderId: string, status: Exclude<CnOrderStatus, 'pending_confirmation'>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cn_bulk_orders')
    .update({ status, confirmed_at: status === 'confirmed' ? new Date().toISOString() : null })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

/** 保存某产品的推送工厂选择；selection 为 null 时清除（回到默认供应商）。 */
export async function setPushSupplier(
  orderId: string,
  erpProductId: string,
  selection: PushSupplierSelection | null
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cn_bulk_orders')
    .select('push_suppliers')
    .eq('id', orderId)
    .single<{ push_suppliers: Record<string, PushSupplierSelection> }>();
  if (error) throw new Error(error.message);

  const next = { ...(data?.push_suppliers ?? {}) };
  if (selection) next[erpProductId] = selection;
  else delete next[erpProductId];

  const { error: updateError } = await supabase
    .from('cn_bulk_orders')
    .update({ push_suppliers: next })
    .eq('id', orderId);
  if (updateError) throw new Error(updateError.message);
}
