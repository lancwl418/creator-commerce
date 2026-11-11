import type { ErpProduct } from './types';

/** 产品的默认供应商（ERP mainSupplierId）。原名取供应商报价上的名称，没有时取产品 vendor。 */
export interface ProductSupplier {
  id: string;
  originalName: string;
}

export function getMainSupplier(
  product: Pick<ErpProduct, 'mainSupplierId' | 'suppliers' | 'vendor'>
): ProductSupplier | null {
  const id = product.mainSupplierId?.trim();
  if (!id) return null;
  const quote = (product.suppliers ?? []).find((s) => s.supplierId === id);
  const originalName = quote?.name?.trim() || product.vendor?.trim() || '';
  return { id, originalName };
}

/** 某供应商 + 它在一批产品里是几个产品的默认供应商 */
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

/**
 * 账号的可见供应商范围：null = 不限（白名单为空）；否则只含名单里的供应商 id。
 * 对应 Supabase 表 cn_seller_supplier_access。
 */
export type SupplierScope = ReadonlySet<string> | null;

/** 白名单行 → 范围。没有任何行时为 null（看全部）。 */
export function toSupplierScope(supplierIds: Iterable<string>): SupplierScope {
  const ids = new Set([...supplierIds].map((id) => id.trim()).filter(Boolean));
  return ids.size > 0 ? ids : null;
}

/** 产品是否在范围内：按主供应商判断；有白名单时，没标主供应商的产品不可见。 */
export function isProductInSupplierScope(
  product: Pick<ErpProduct, 'mainSupplierId'>,
  scope: SupplierScope
): boolean {
  if (!scope) return true;
  const id = product.mainSupplierId?.trim();
  return !!id && scope.has(id);
}
