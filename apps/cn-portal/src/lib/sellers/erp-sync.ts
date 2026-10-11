import {
  createCustomer,
  fetchCustomerLevels,
  type ErpCustomerCreateInput,
  type ErpCustomerLevel,
} from '@creator-commerce/shared/erp';
import { TIER_TO_ERP_LEVEL_NAME, type SellerTier } from '@creator-commerce/shared/erp/pricing';
import { getErpConfig } from '../erp';
import { createServiceClient } from '../supabase/service';

export interface SellerErpSyncInput {
  authUserId: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  tier: SellerTier;
}

export type SellerErpSyncResult =
  | { status: 'synced'; erpCustomerId: string; erpCustomerLevelId: string }
  | { status: 'failed'; error: string };

/** 接口文档「客户档案」：部门信息目前统一为 A02A04 */
const ERP_CUSTOMER_ORG_CODE = 'A02A04';
const ERP_CUSTOMER_SOURCE = 'cn-portal';

/** 按卖家等级对应的 ERP 等级名，在 ERP 现有等级里找到那一条。 */
export function findErpLevelForTier(levels: ErpCustomerLevel[], tier: SellerTier): ErpCustomerLevel | null {
  const levelName = TIER_TO_ERP_LEVEL_NAME[tier];
  return levels.find((level) => level.levelName === levelName) ?? null;
}

/** 卖家资料 → ERP 新增客户请求体。只传注册时收集到的信息，不编造地址等缺失字段。 */
export function buildErpCustomer(seller: SellerErpSyncInput, level: ErpCustomerLevel): ErpCustomerCreateInput {
  return {
    createBy: ERP_CUSTOMER_SOURCE,
    sysOrgCode: ERP_CUSTOMER_ORG_CODE,
    custName: seller.companyName,
    custContact: seller.contactName,
    custTel: seller.phone,
    custPhone: seller.phone,
    custEmail: seller.email,
    custState: 'active',
    custSource: ERP_CUSTOMER_SOURCE,
    status: 2,
    custStageId: level.id,
    vipStage: level.levelName,
  };
}

/**
 * 卖家账户 → ERP 客户档案。注册成功后调用，登录时对未同步的账户重试。
 *
 * 1. 取 ERP 客户等级列表，找到卖家等级对应的那一级（如「中国商家」）；
 * 2. 调「新增客户」接口写入等级；
 * 3. 用服务端密钥把 ERP 客户 id 和等级 id 回写 cn_sellers（该表对登录用户只读）。
 * 任一步失败都记为 failed 并保留原因，不抛给调用方。
 */
export async function syncSellerToErp(seller: SellerErpSyncInput): Promise<SellerErpSyncResult> {
  const supabase = createServiceClient();
  try {
    const level = findErpLevelForTier(await fetchCustomerLevels(getErpConfig()), seller.tier);
    if (!level) throw new Error(`ERP has no customer level named ${TIER_TO_ERP_LEVEL_NAME[seller.tier]}`);

    const created = await createCustomer(getErpConfig(), buildErpCustomer(seller, level));
    const { error } = await supabase
      .from('cn_sellers')
      .update({
        erp_customer_id: created.id,
        erp_customer_level_id: level.id,
        erp_synced_at: new Date().toISOString(),
        erp_sync_status: 'synced',
        erp_sync_error: null,
      })
      .eq('auth_user_id', seller.authUserId);
    if (error) throw new Error(`Failed to record ERP customer id: ${error.message}`);
    return { status: 'synced', erpCustomerId: created.id, erpCustomerLevelId: level.id };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error('Seller ERP sync failed', { authUserId: seller.authUserId, message });
    await supabase
      .from('cn_sellers')
      .update({ erp_sync_status: 'failed', erp_sync_error: message.slice(0, 500) })
      .eq('auth_user_id', seller.authUserId);
    return { status: 'failed', error: message };
  }
}
