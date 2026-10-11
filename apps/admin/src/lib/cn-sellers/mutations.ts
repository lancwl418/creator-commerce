import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { createClient } from '@/lib/supabase/client';

/** 调整卖家的价格等级。写入权限由 RLS 的 cn_sellers_admin_update 控制。 */
export async function updateCnSellerTier(sellerId: string, tier: SellerTier): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('cn_sellers').update({ seller_tier: tier }).eq('id', sellerId);
  if (error) throw new Error(error.message);
}
