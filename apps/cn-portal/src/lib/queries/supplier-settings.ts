import { createClient } from '../supabase/server';
import type { SupplierNameMap } from '../suppliers/suppliers';

interface SupplierSettingRow {
  supplier_id: string;
  display_name: string;
}

/** 管理员自定义的供应商显示名（supplier_id → display_name）。表为空时返回空 Map。 */
export async function loadSupplierNames(): Promise<SupplierNameMap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_supplier_settings')
    .select('supplier_id, display_name')
    .returns<SupplierSettingRow[]>();
  if (error) throw new Error(`Failed to load supplier settings: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.supplier_id, row.display_name]));
}
