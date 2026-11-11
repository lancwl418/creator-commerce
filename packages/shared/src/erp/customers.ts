import { createCustomer, fetchCustomerLevels, type ErpConfig } from './client';
import { TIER_TO_ERP_LEVEL_NAME, type SellerTier } from './pricing';
import type { ErpCustomerCreateInput, ErpCustomerLevel } from './types';

/** 建 ERP 客户档案所需的卖家资料（cn-portal 注册、Admin 创建共用） */
export interface SellerErpCustomerInput {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  tier: SellerTier;
}

/** 接口文档「客户档案」：部门信息目前统一为 A02A04 */
const ERP_CUSTOMER_ORG_CODE = 'A02A04';
const ERP_CUSTOMER_SOURCE = 'cn-portal';

/** 按卖家等级对应的 ERP 等级名，在 ERP 现有等级里找到那一条。 */
export function findErpLevelForTier(levels: ErpCustomerLevel[], tier: SellerTier): ErpCustomerLevel | null {
  const levelName = TIER_TO_ERP_LEVEL_NAME[tier];
  return levels.find((level) => level.levelName === levelName) ?? null;
}

/** 卖家资料 → ERP 新增客户请求体。只传已收集到的信息，不编造地址等缺失字段。 */
export function buildErpCustomer(seller: SellerErpCustomerInput, level: ErpCustomerLevel): ErpCustomerCreateInput {
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
 * 在 ERP 建客户档案：取等级列表 → 找卖家等级对应的那一级 → 调「新增客户」。
 * 只负责 ERP 一侧；把结果写回 creators 由调用方决定用哪个 Supabase client。
 */
export async function createSellerErpCustomer(
  cfg: ErpConfig,
  seller: SellerErpCustomerInput
): Promise<{ erpCustomerId: string; erpCustomerLevelId: string }> {
  const level = findErpLevelForTier(await fetchCustomerLevels(cfg), seller.tier);
  if (!level) throw new Error(`ERP has no customer level named ${TIER_TO_ERP_LEVEL_NAME[seller.tier]}`);
  const created = await createCustomer(cfg, buildErpCustomer(seller, level));
  return { erpCustomerId: created.id, erpCustomerLevelId: level.id };
}
