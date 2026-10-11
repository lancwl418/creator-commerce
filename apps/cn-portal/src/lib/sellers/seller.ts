import { isSellerTier } from '@creator-commerce/shared/erp/pricing';
import type { Seller, SellerRow } from '../types/seller';

export const SELLER_COLUMNS = 'id, email, company_name, contact_name, phone, seller_tier, erp_customer_id';

export function toSeller(row: SellerRow): Seller {
  // 等级决定价格：数据库里出现代码不认识的等级时报错，不默认成某个等级。
  if (!isSellerTier(row.seller_tier)) {
    throw new Error(`Unknown seller tier: ${row.seller_tier}`);
  }
  return {
    id: row.id,
    email: row.email,
    companyName: row.company_name,
    contactName: row.contact_name,
    phone: row.phone,
    tier: row.seller_tier,
    erpCustomerId: row.erp_customer_id,
  };
}
