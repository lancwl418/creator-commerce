import type { ProductSupplier } from '@creator-commerce/shared/erp/suppliers';

// 主供应商识别、汇总、按账号白名单过滤是领域规则，放在 shared，Admin 也要用。
export {
  getMainSupplier,
  collectSuppliers,
  isProductInSupplierScope,
  toSupplierScope,
  type ProductSupplier,
  type SupplierSummary,
  type SupplierScope,
} from '@creator-commerce/shared/erp/suppliers';

/** 供应商在界面上的名称：管理员自定义的显示名优先，没有就用 ERP 原名。 */
export type SupplierNameMap = Map<string, string>;

export function displaySupplierName(supplier: ProductSupplier, names: SupplierNameMap): string {
  return names.get(supplier.id)?.trim() || supplier.originalName || supplier.id;
}

export const SUPPLIER_NAME_MAX_LENGTH = 100;

export interface SupplierNameInput {
  supplierId: string;
  /** 为空 = 清除自定义，回到 ERP 原名 */
  displayName: string;
}

/**
 * 解析设置页表单：字段名 `name:<supplierId>`；只接受当前目录里存在的供应商 id。
 * 超长的名称返回错误而不是截断。
 */
export function parseSupplierNameForm(
  form: FormData,
  knownSupplierIds: Iterable<string>
): { ok: true; inputs: SupplierNameInput[] } | { ok: false; error: 'tooLong' } {
  const known = new Set(knownSupplierIds);
  const inputs: SupplierNameInput[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('name:') || typeof value !== 'string') continue;
    const supplierId = key.slice('name:'.length);
    if (!known.has(supplierId)) continue;
    const displayName = value.trim();
    if (displayName.length > SUPPLIER_NAME_MAX_LENGTH) return { ok: false, error: 'tooLong' };
    inputs.push({ supplierId, displayName });
  }
  return { ok: true, inputs };
}
