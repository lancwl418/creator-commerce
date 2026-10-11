import { cache } from 'react';
import { createClient } from '../supabase/server';
import { SELLER_COLUMNS, toSeller } from '../sellers/seller';
import type { Seller, SellerRow } from '../types/seller';

/** 当前登录用户的卖家账户；未登录或该用户没有卖家账户时返回 null。同一次请求内只查一次。 */
export const getCurrentSeller = cache(async (): Promise<Seller | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('cn_sellers')
    .select(SELLER_COLUMNS)
    .eq('auth_user_id', user.id)
    .maybeSingle<SellerRow>();
  if (error) throw new Error(`Failed to load seller account: ${error.message}`);
  return data ? toSeller(data) : null;
});
