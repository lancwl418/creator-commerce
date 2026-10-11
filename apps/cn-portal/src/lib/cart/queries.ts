import { createClient } from '../supabase/server';
import type { CartItemRow } from '../types/bulk-order';

export const CART_COLUMNS = 'id, erp_product_id, product_title, sku_id, sku, option1, option2, option3, quantity';

export async function getCartItems(creatorId: string): Promise<CartItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_cart_items')
    .select(CART_COLUMNS)
    .eq('creator_id', creatorId)
    .order('created_at')
    .returns<CartItemRow[]>();
  if (error) throw new Error(`Failed to load cart: ${error.message}`);
  return data ?? [];
}

export async function getCartCount(creatorId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from('cn_cart_items').select('id', { count: 'exact', head: true }).eq('creator_id', creatorId);
  return count ?? 0;
}
