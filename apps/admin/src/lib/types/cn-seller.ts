import type { SellerTier } from '@creator-commerce/shared/erp/pricing';

/** 中国卖家：creators 表里 user_type = cn_seller 的记录（后台视角） */
export interface CnSellerRow {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  seller_tier: SellerTier;
  erp_customer_id: string | null;
  erp_sync_status: 'pending' | 'synced' | 'failed';
  erp_sync_error: string | null;
  created_at: string;
}

/** 查询返回的原始行；未同步过的账户 erp_sync_status 可能为空 */
export type CnSellerQueryRow = Omit<CnSellerRow, 'erp_sync_status'> & { erp_sync_status: CnSellerRow['erp_sync_status'] | null };

/** 供应商选项（给卖家分配可见供应商用）：ERP 主供应商 id + 原名 + 目录里的产品数 */
export interface SupplierOptionLite {
  id: string;
  name: string;
  productCount: number;
}

export interface CnSellersPageProps {
  searchParams: Promise<{ q?: string }>;
}
