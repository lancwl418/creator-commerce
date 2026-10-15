'use server';

import { revalidatePath } from 'next/cache';
import { t } from '../i18n';
import { loadAllErpProducts } from '../erp-products.server';
import { isApprovedErpProduct } from '../catalog';
import { requireAdmin } from '../sellers/session';
import { createClient } from '../supabase/server';
import { collectSuppliers, parseSupplierNameForm } from './suppliers';

export interface SupplierSettingsFormState {
  error?: string;
  notice?: string;
}

/**
 * 保存供应商显示名。只有管理员能进来（requireAdmin），写入再由 RLS（is_admin）兜底。
 * 填空 = 删掉自定义，目录回到 ERP 原名。
 */
export async function saveSupplierNames(
  _state: SupplierSettingsFormState,
  form: FormData
): Promise<SupplierSettingsFormState> {
  const admin = await requireAdmin();
  const suppliers = collectSuppliers((await loadAllErpProducts()).filter(isApprovedErpProduct));
  const parsed = parseSupplierNameForm(form, suppliers.map((s) => s.id));
  if (!parsed.ok) return { error: t('settings.suppliers.error.tooLong') };

  const originalNames = new Map(suppliers.map((s) => [s.id, s.originalName]));
  const upserts = parsed.inputs
    .filter((input) => input.displayName)
    .map((input) => ({
      supplier_id: input.supplierId,
      original_name: originalNames.get(input.supplierId) ?? '',
      display_name: input.displayName,
      updated_by: admin.authUserId,
    }));
  const clears = parsed.inputs.filter((input) => !input.displayName).map((input) => input.supplierId);

  const supabase = await createClient();
  if (upserts.length > 0) {
    const { error } = await supabase.from('cn_supplier_settings').upsert(upserts, { onConflict: 'supplier_id' });
    if (error) return { error: error.message };
  }
  if (clears.length > 0) {
    const { error } = await supabase.from('cn_supplier_settings').delete().in('supplier_id', clears);
    if (error) return { error: error.message };
  }
  revalidatePath('/products');
  revalidatePath('/settings/suppliers');
  return { notice: t('settings.suppliers.saved') };
}
