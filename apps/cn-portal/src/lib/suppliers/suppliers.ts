import type { ErpProduct } from '@creator-commerce/shared/erp/types';

/** 产品的默认供应商（ERP mainSupplierId）。原名取供应商报价上的名称，没有时取产品 vendor。 */
export interface ProductSupplier {
  id: string;
  originalName: string;
}

/** 供应商在界面上的名称：管理员自定义的显示名优先，没有就用 ERP 原名。 */
export type SupplierNameMap = Map<string, string>;

export function getMainSupplier(
  product: Pick<ErpProduct, 'mainSupplierId' | 'suppliers' | 'vendor'>
): ProductSupplier | null {
  const id = product.mainSupplierId?.trim();
  if (!id) return null;
  const quote = (product.suppliers ?? []).find((s) => s.supplierId === id);
  const originalName = quote?.name?.trim() || product.vendor?.trim() || '';
  return { id, originalName };
}

export function displaySupplierName(supplier: ProductSupplier, names: SupplierNameMap): string {
  return names.get(supplier.id)?.trim() || supplier.originalName || supplier.id;
}

/** 设置页的一行：某供应商 + 它在目录里有几个产品 */
export interface SupplierSummary extends ProductSupplier {
  productCount: number;
}

/** 汇总一批产品的默认供应商（去重，按产品数降序）。 */
export function collectSuppliers(products: ErpProduct[]): SupplierSummary[] {
  const byId = new Map<string, SupplierSummary>();
  for (const product of products) {
    const supplier = getMainSupplier(product);
    if (!supplier) continue;
    const existing = byId.get(supplier.id);
    if (existing) {
      existing.productCount += 1;
      if (!existing.originalName) existing.originalName = supplier.originalName;
    } else {
      byId.set(supplier.id, { ...supplier, productCount: 1 });
    }
  }
  return [...byId.values()].sort((a, b) => b.productCount - a.productCount || a.id.localeCompare(b.id));
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
