import { createSellerErpCustomer, type SellerErpCustomerInput } from '@creator-commerce/shared/erp';
import { getErpConfig } from '../erp';
import { createServiceClient } from '../supabase/service';

// 等级匹配和请求体构造是领域规则，放在 shared（Admin 创建卖家也用）；测试仍从这里引用。
export { buildErpCustomer, findErpLevelForTier } from '@creator-commerce/shared/erp';

export interface SellerErpSyncInput extends SellerErpCustomerInput {
  authUserId: string;
}

export type SellerErpSyncResult =
  | { status: 'synced'; erpCustomerId: string; erpCustomerLevelId: string }
  | { status: 'failed'; error: string };

/**
 * 卖家账户 → ERP 客户档案。注册成功后调用，登录时对未同步的账户重试。
 *
 * 1. 取 ERP 客户等级列表，找到卖家等级对应的那一级（如「中国商家」）；
 * 2. 调「新增客户」接口写入等级；
 * 3. 用服务端密钥把 ERP 客户 id 和等级 id 回写 creators（这些列只允许 admin / 服务端修改）。
 * 任一步失败都记为 failed 并保留原因，不抛给调用方。
 */
export async function syncSellerToErp(seller: SellerErpSyncInput): Promise<SellerErpSyncResult> {
  const supabase = createServiceClient();
  try {
    const created = await createSellerErpCustomer(getErpConfig(), seller);
    const { error } = await supabase
      .from('creators')
      .update({
        erp_customer_id: created.erpCustomerId,
        erp_customer_level_id: created.erpCustomerLevelId,
        erp_synced_at: new Date().toISOString(),
        erp_sync_status: 'synced',
        erp_sync_error: null,
      })
      .eq('auth_user_id', seller.authUserId);
    if (error) throw new Error(`Failed to record ERP customer id: ${error.message}`);
    return { status: 'synced', ...created };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error('Seller ERP sync failed', { authUserId: seller.authUserId, message });
    await supabase
      .from('creators')
      .update({ erp_sync_status: 'failed', erp_sync_error: message.slice(0, 500) })
      .eq('auth_user_id', seller.authUserId);
    return { status: 'failed', error: message };
  }
}
