import {
  collectSuppliers,
  erpConfigFromEnv,
  fetchProducts,
  type ErpProduct,
  type SupplierSummary,
} from '@creator-commerce/shared/erp';
import { createClient } from '@/lib/supabase/server';

// ERP 产品列表只能分页全量拉（每 100 条 2~3 秒），后台页面不能每次都等：结果在进程内缓存一段时间。
const ERP_SUPPLIERS_TTL_MS = 10 * 60 * 1000;
const ERP_SCAN_PAGE_SIZE = 100;
/** ERP 产品审批状态：2 = 通过（cn-portal 目录只收这些） */
const ERP_STATUS_APPROVED = 2;

let cached: { at: number; value: Promise<SupplierSummary[]> } | null = null;

async function loadAllErpProducts(): Promise<ErpProduct[]> {
  const cfg = erpConfigFromEnv();
  const first = await fetchProducts(cfg, 1, ERP_SCAN_PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) => fetchProducts(cfg, index + 2, ERP_SCAN_PAGE_SIZE))
  );
  return [first, ...rest].flatMap((page) => page.records);
}

/** cn-portal 目录里出现的全部主供应商（按产品数降序），给卖家分配可见供应商用。 */
export function getErpSupplierOptions(): Promise<SupplierSummary[]> {
  if (cached && Date.now() - cached.at < ERP_SUPPLIERS_TTL_MS) return cached.value;
  const value = loadAllErpProducts().then((products) =>
    collectSuppliers(products.filter((p) => Number(p.status) === ERP_STATUS_APPROVED))
  );
  cached = { at: Date.now(), value };
  // 失败不缓存，下次进页面重试
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

/** 一批卖家的可见供应商白名单：sellerId → supplierId[]；没有的卖家不在 Map 里（= 看全部）。 */
export async function getCnSellerSupplierAccess(sellerIds: string[]): Promise<Map<string, string[]>> {
  const access = new Map<string, string[]>();
  if (sellerIds.length === 0) return access;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_seller_supplier_access')
    .select('creator_id, supplier_id')
    .in('creator_id', sellerIds)
    .returns<{ creator_id: string; supplier_id: string }[]>();
  if (error) throw new Error(`Failed to load seller supplier access: ${error.message}`);
  for (const row of data ?? []) {
    const list = access.get(row.creator_id);
    if (list) list.push(row.supplier_id);
    else access.set(row.creator_id, [row.supplier_id]);
  }
  return access;
}
