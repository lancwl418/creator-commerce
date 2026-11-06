import type { SupabaseClient } from '@supabase/supabase-js';
import { queryFactoryDeliveries, queryFactoryStatuses } from './adapters';
import type { FactorySupplierRow } from './types';

// 工厂状态/物流回查：批量查未完结的推送，更新 cn_factory_pushes。
// 终态（12 已发货 / 13 已关闭 / 15 已退款）后不再查；状态 3 = 工厂反审，需人工处理。

const TERMINAL_STATUSES = [12, 13, 15];
const SHIPPED_STATUS = 12;
const BATCH_SIZE = 100;

interface SyncablePush {
  id: string;
  platform_oid: string;
  order_status: number | null;
  pushed_at: string | null;
  tracking_number: string | null;
  cn_factory_suppliers: FactorySupplierRow | null;
}

export interface FactorySyncResult {
  checked: number;
  updated: number;
  errors: string[];
}

/** 回查所有未完结推送的工厂状态和运单号。supabase 用调用方的会话（admin RLS / cron 用 service）。 */
export async function syncFactoryPushStatuses(supabase: SupabaseClient): Promise<FactorySyncResult> {
  const { data: pushes, error } = await supabase
    .from('cn_factory_pushes')
    .select('id, platform_oid, order_status, pushed_at, tracking_number, cn_factory_suppliers (*)')
    .or(`order_status.is.null,order_status.not.in.(${TERMINAL_STATUSES.join(',')})`)
    .returns<SyncablePush[]>();
  if (error) return { checked: 0, updated: 0, errors: [error.message] };

  const byFactory = new Map<string, { factory: FactorySupplierRow; pushes: SyncablePush[] }>();
  for (const push of pushes ?? []) {
    const factory = push.cn_factory_suppliers;
    if (!factory) continue;
    const group = byFactory.get(factory.id) ?? { factory, pushes: [] };
    group.pushes.push(push);
    byFactory.set(factory.id, group);
  }

  const result: FactorySyncResult = { checked: (pushes ?? []).length, updated: 0, errors: [] };

  for (const { factory, pushes: factoryPushes } of byFactory.values()) {
    for (let start = 0; start < factoryPushes.length; start += BATCH_SIZE) {
      const batch = factoryPushes.slice(start, start + BATCH_SIZE);
      const byOid = new Map(batch.map((p) => [p.platform_oid, p]));
      const now = new Date().toISOString();

      let statuses;
      try {
        statuses = await queryFactoryStatuses(factory, [...byOid.keys()]);
      } catch (cause) {
        result.errors.push(`${factory.key} status query: ${cause instanceof Error ? cause.message : String(cause)}`);
        continue;
      }

      const shippedOids: string[] = [];
      for (const status of statuses) {
        const push = byOid.get(status.platformOid);
        if (!push || status.orderStatus === null) continue;
        const changed = status.orderStatus !== push.order_status;
        // 状态 ≥ 4（工厂审核起）说明已从待推送推进了工厂
        const update: Record<string, unknown> = {
          order_status: status.orderStatus,
          order_status_str: status.orderStatusStr,
          status_synced_at: now,
          ...(status.orderStatus >= 4 && !push.pushed_at ? { pushed_at: now } : {}),
        };
        const { error: updateError } = await supabase.from('cn_factory_pushes').update(update).eq('id', push.id);
        if (updateError) result.errors.push(`${status.platformOid}: ${updateError.message}`);
        else if (changed) result.updated += 1;
        // 工厂审核（4）到已发货（12）之间可能已有运单号
        if (status.orderStatus >= 4 && status.orderStatus <= SHIPPED_STATUS && !push.tracking_number) {
          shippedOids.push(status.platformOid);
        }
      }

      if (shippedOids.length === 0) continue;
      try {
        const deliveries = await queryFactoryDeliveries(factory, shippedOids);
        for (const delivery of deliveries) {
          const push = byOid.get(delivery.platformOid);
          if (!push || !delivery.trackingNumber) continue;
          const { error: updateError } = await supabase
            .from('cn_factory_pushes')
            .update({
              tracking_number: delivery.trackingNumber,
              carrier: delivery.carrier,
              waybill_url: delivery.waybillUrl,
              shipped_at: delivery.shippedAt?.toISOString() ?? null,
            })
            .eq('id', push.id);
          if (updateError) result.errors.push(`${delivery.platformOid}: ${updateError.message}`);
        }
      } catch (cause) {
        result.errors.push(`${factory.key} delivery query: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }
  }

  return result;
}
