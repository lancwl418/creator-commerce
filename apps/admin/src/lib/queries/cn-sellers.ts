import { createClient } from '@/lib/supabase/server';
import type { CnSellerQueryRow, CnSellerRow } from '@/lib/types/cn-seller';

export const CN_SELLER_COLUMNS =
  'id, email, company_name, contact_name, phone, seller_tier, erp_customer_id, erp_sync_status, erp_sync_error, created_at';

const PAGE_SIZE = 100;

/** 中国卖家列表，最新注册在前；q 按公司名 / 邮箱 / 联系人模糊匹配。 */
export async function getCnSellers(q = ''): Promise<CnSellerRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('creators')
    .select(CN_SELLER_COLUMNS)
    .eq('user_type', 'cn_seller')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  const keyword = q.trim().replace(/[%,()]/g, '');
  if (keyword) {
    query = query.or(`company_name.ilike.%${keyword}%,email.ilike.%${keyword}%,contact_name.ilike.%${keyword}%`);
  }

  const { data, error } = await query.returns<CnSellerQueryRow[]>();
  if (error) throw new Error(`Failed to load CN sellers: ${error.message}`);
  return (data ?? []).map((row) => ({ ...row, erp_sync_status: row.erp_sync_status ?? 'pending' }));
}
