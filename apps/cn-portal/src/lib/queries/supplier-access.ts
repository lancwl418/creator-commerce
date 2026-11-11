import { cache } from 'react';
import { createClient } from '../supabase/server';
import { toSupplierScope, type SupplierScope } from '../suppliers/suppliers';

/**
 * 卖家的可见供应商范围（cn_seller_supplier_access，管理员在 Admin 分配）。
 * 没有任何行 → null（看全部）。同一次请求内只查一次。
 */
export const getSellerSupplierScope = cache(async (sellerId: string): Promise<SupplierScope> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_seller_supplier_access')
    .select('supplier_id')
    .eq('creator_id', sellerId)
    .returns<{ supplier_id: string }[]>();
  if (error) throw new Error(`Failed to load seller supplier access: ${error.message}`);
  return toSupplierScope((data ?? []).map((row) => row.supplier_id));
});
