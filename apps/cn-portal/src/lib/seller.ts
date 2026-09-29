import { cookies } from 'next/headers';
import type { SellerTier } from '@creator-commerce/shared/erp';

const TIER_COOKIE = 'cn_seller_tier';
const VALID_TIERS: SellerTier[] = ['VIP', 'WHOLESALE'];

/**
 * 解析当前登录卖家的等级。
 *
 * 目标接入方式：卖家登录 → 拿 auth 身份 → 调 ERP customer 接口读其价格等级 →
 * 映射为平台 SellerTier（文档 4.1）。tier 数据源在 ERP。
 *
 * 当前（auth 与 ERP tier 接口未接入）：
 *   - 读 cookie `cn_seller_tier`（VIP / WHOLESALE）作为 QA / 联调覆盖，
 *     便于验收标准 #1「两个等级账号看到不同价格」；
 *   - 缺省回退到 VIP。
 * ERP tier 接口接入后，把 cookie 分支换成真实调用即可。
 */
export async function getCurrentSellerTier(): Promise<SellerTier> {
  const store = await cookies();
  const raw = store.get(TIER_COOKIE)?.value as SellerTier | undefined;
  if (raw && VALID_TIERS.includes(raw)) return raw;
  return 'VIP';
}
