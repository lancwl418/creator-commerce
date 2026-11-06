import { createClient } from '@/lib/supabase/server';

/** 一条工厂推送记录（带工厂信息，列表展示用） */
export interface FactoryPushRow {
  id: string;
  order_id: string;
  platform_oid: string;
  placed_at: string;
  pushed_at: string | null;
  order_status: number | null;
  order_status_str: string | null;
  tracking_number: string | null;
  last_error: string | null;
  cn_factory_suppliers: { key: string; name: string; console_url: string | null } | null;
}

export type FactoryPushMap = Record<string, FactoryPushRow[]>;

/** 这批订单的工厂推送记录，orderId → 推送列表（新在前） */
export async function getFactoryPushes(orderIds: string[]): Promise<FactoryPushMap> {
  if (orderIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_factory_pushes')
    .select('id, order_id, platform_oid, placed_at, pushed_at, order_status, order_status_str, tracking_number, last_error, cn_factory_suppliers (key, name, console_url)')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false })
    .returns<FactoryPushRow[]>();
  if (error) throw new Error(`Failed to load factory pushes: ${error.message}`);

  const map: FactoryPushMap = {};
  for (const row of data ?? []) {
    (map[row.order_id] ??= []).push(row);
  }
  return map;
}
