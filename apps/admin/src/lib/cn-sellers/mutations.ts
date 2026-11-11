import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { createClient } from '@/lib/supabase/client';

/** 调整卖家的价格等级。写入权限由 RLS 的 creators_admin_update 和 creators 上的保护触发器控制。 */
export async function updateCnSellerTier(sellerId: string, tier: SellerTier): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('creators').update({ seller_tier: tier }).eq('id', sellerId).eq('user_type', 'cn_seller');
  if (error) throw new Error(error.message);
}

/**
 * 整体替换卖家的可见供应商白名单（空数组 = 看全部）。
 * 走 set_cn_seller_supplier_access RPC，删旧插新在同一事务里；仅管理员可调（见 migration 038）。
 */
export async function updateCnSellerSuppliers(sellerId: string, supplierIds: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('set_cn_seller_supplier_access', {
    p_creator_id: sellerId,
    p_supplier_ids: supplierIds,
  });
  if (error) throw new Error(error.message);
}
