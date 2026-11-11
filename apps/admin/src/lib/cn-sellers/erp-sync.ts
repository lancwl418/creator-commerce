import { createSellerErpCustomer, erpConfigFromEnv, type SellerErpCustomerInput } from '@creator-commerce/shared/erp';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CnSellerErpSyncResult = { status: 'synced'; erpCustomerId: string } | { status: 'failed'; error: string };

/**
 * 在 ERP 建卖家的客户档案，并把结果写回 creators。
 * 用当前管理员会话写（ERP 列只允许管理员 / 服务端改，见 migration 029）。失败记为 failed，不抛错。
 */
export async function syncCnSellerToErp(
  supabase: SupabaseClient,
  sellerId: string,
  seller: SellerErpCustomerInput
): Promise<CnSellerErpSyncResult> {
  try {
    const created = await createSellerErpCustomer(erpConfigFromEnv(), seller);
    const { error } = await supabase
      .from('creators')
      .update({
        erp_customer_id: created.erpCustomerId,
        erp_customer_level_id: created.erpCustomerLevelId,
        erp_synced_at: new Date().toISOString(),
        erp_sync_status: 'synced',
        erp_sync_error: null,
      })
      .eq('id', sellerId);
    if (error) throw new Error(`Failed to record ERP customer id: ${error.message}`);
    return { status: 'synced', erpCustomerId: created.erpCustomerId };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error('[admin] CN seller ERP sync failed', { sellerId, message });
    await supabase
      .from('creators')
      .update({ erp_sync_status: 'failed', erp_sync_error: message.slice(0, 500) })
      .eq('id', sellerId);
    return { status: 'failed', error: message };
  }
}
