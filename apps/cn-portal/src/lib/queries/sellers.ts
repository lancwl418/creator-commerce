import { cache } from 'react';
import { createClient } from '../supabase/server';
import { SELLER_COLUMNS, toSeller } from '../sellers/seller';
import type { Seller, SellerRow } from '../types/seller';

/** 当前登录用户的卖家账户；未登录或该用户没有卖家账户时返回 null。同一次请求内只查一次。 */
export const getCurrentSeller = cache(async (): Promise<Seller | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // admin_users 的 RLS 只让管理员读到自己那行，普通卖家查到空结果而不是报错。
  const [sellerResult, adminResult] = await Promise.all([
    supabase
      .from('creators')
      .select(SELLER_COLUMNS)
      .eq('auth_user_id', user.id)
      .eq('user_type', 'cn_seller')
      .maybeSingle<SellerRow>(),
    supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle<{ id: string }>(),
  ]);
  if (sellerResult.error) throw new Error(`Failed to load seller account: ${sellerResult.error.message}`);
  if (adminResult.error) throw new Error(`Failed to check admin role: ${adminResult.error.message}`);
  return sellerResult.data
    ? toSeller(sellerResult.data, { authUserId: user.id, isAdmin: adminResult.data != null })
    : null;
});
