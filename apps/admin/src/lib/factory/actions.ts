'use server';

import { revalidatePath } from 'next/cache';
import { pushCnOrderToFactories } from './push-service';
import type { FactoryPushOutcome } from './types';

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
