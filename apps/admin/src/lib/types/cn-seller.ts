import type { SellerTier } from '@creator-commerce/shared/erp/pricing';

/** cn_sellers 表的一行（后台视角） */
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

export interface CnSellersPageProps {
  searchParams: Promise<{ q?: string }>;
}
