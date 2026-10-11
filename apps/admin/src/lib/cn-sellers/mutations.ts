import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { createClient } from '@/lib/supabase/client';

/** 调整卖家的价格等级。写入权限由 RLS 的 creators_admin_update 和 creators 上的保护触发器控制。 */
export async function updateCnSellerTier(sellerId: string, tier: SellerTier): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('creators').update({ seller_tier: tier }).eq('id', sellerId).eq('user_type', 'cn_seller');
  if (error) throw new Error(error.message);
}
