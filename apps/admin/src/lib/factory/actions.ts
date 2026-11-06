'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { previewCnOrderPush, pushCnOrderToFactories } from './push-service';
import { syncFactoryPushStatuses, type FactorySyncResult } from './status-sync';
import type { FactoryPushOutcome, FactoryPushPlan } from './types';

/** 推送前预览：组装报文摘要给确认弹窗，不发送任何请求到工厂 */
export async function previewFactoryPushAction(orderId: string): Promise<{ plan?: FactoryPushPlan; error?: string }> {
  try {
    return await previewCnOrderPush(orderId);
  } catch (cause) {
    console.error('[admin] Factory push preview failed', cause);
    return { error: cause instanceof Error ? cause.message : 'Preview failed' };
  }
}

/** 推送采购单到工厂（Server Action：密钥只在服务端，RLS 用当前 admin 会话） */
export async function pushOrderToFactoriesAction(
  orderId: string
): Promise<{ outcomes: FactoryPushOutcome[]; error?: string }> {
  try {
    const result = await pushCnOrderToFactories(orderId);
    if (result.outcomes.some((o) => o.ok)) revalidatePath('/dashboard/cn-orders');
    return result;
  } catch (cause) {
    console.error('[admin] Factory push failed', cause);
    return { outcomes: [], error: cause instanceof Error ? cause.message : 'Factory push failed' };
  }
}

/** 回查工厂状态/运单号（手动刷新；cron 走 /api/cron/sync-factory-status） */
export async function syncFactoryStatusesAction(): Promise<FactorySyncResult> {
  try {
    const supabase = await createClient();
    const result = await syncFactoryPushStatuses(supabase);
    if (result.updated > 0) revalidatePath('/dashboard/cn-orders');
    return result;
  } catch (cause) {
    console.error('[admin] Factory status sync failed', cause);
    return { checked: 0, updated: 0, errors: [cause instanceof Error ? cause.message : 'Sync failed'] };
  }
}
