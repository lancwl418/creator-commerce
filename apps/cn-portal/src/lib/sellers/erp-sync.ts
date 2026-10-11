import type { SellerTier } from '@creator-commerce/shared/erp/pricing';

export interface SellerErpSyncInput {
  authUserId: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  tier: SellerTier;
}

export type SellerErpSyncResult =
  | { status: 'skipped' }
  | { status: 'synced'; erpCustomerId: string };

/**
 * 卖家账户 → ERP 客户档案的对接口，注册成功后调用。
 *
 * 目前不对接 ERP：账户只建在平台侧（cn_sellers），这里直接返回 skipped。
 * 接入时在这里：
 *   1. 调 ERP「新增客户」接口，把卖家等级写到客户档案的等级字段；
 *   2. 把 ERP 返回的客户 id 回写 cn_sellers.erp_customer_id / erp_synced_at。
 *      该表对登录用户只读，回写要用服务端密钥。
 */
export async function syncSellerToErp(seller: SellerErpSyncInput): Promise<SellerErpSyncResult> {
  void seller;
  return { status: 'skipped' };
}
