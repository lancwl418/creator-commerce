import type { ErpProduct, ErpSku, SellerTier } from '@creator-commerce/shared/erp';
import { createClient } from './supabase/server';
import { buildCatalog, getListableSkus, isApprovedErpProduct } from './catalog';
import type { CatalogResult, PlatformData, ProductDetailData } from './types/catalog';
import { loadAllRows } from './platform-data';
import { loadAllErpProducts, loadErpProduct } from './erp-products.server';

/**
 * 装配 PlatformData。目前只用到起订量（MOQ）——可见性 / 库存过滤已取消，
 * 不再查那两张表，省掉每次列表 / 详情的两次全表扫描。
 */
export async function loadPlatformData(): Promise<PlatformData> {
  const supabase = await createClient();

  const moqRows = await loadAllRows<{ sku: string; min_qty: number | null; min_amount: number | null }>(
    'product_moq', (from, to) =>
      supabase
        .from('product_moq')
        .select('sku, min_qty, min_amount')
        .order('sku')
        .range(from, to)
  );

  const moq = new Map<string, { minQty: number | null; minAmount: number | null }>();
  for (const r of moqRows) {
    moq.set(r.sku, { minQty: r.min_qty, minAmount: r.min_amount });
  }

  // 保留 PlatformData 形状（可见性 / 库存字段留空，已不参与过滤）。
  return { hiddenSkusForTier: new Set(), stock: new Map(), moq };
}

/** 可选的全部产品（只含审批通过的，未分页）。tier 仅为签名兼容，计价统一走 VIP。 */
export async function getCatalog(_tier: SellerTier): Promise<CatalogResult> {
  const [products, data] = await Promise.all([
    loadAllErpProducts(),
    loadPlatformData(),
  ]);
  return buildCatalog(products, data);
}

/** 详情页原始产品 + 平台数据。未审批通过的产品按不存在处理（返回 product=null）。 */
export async function getProductDetail(
  erpProductId: string,
  _tier: SellerTier
): Promise<ProductDetailData> {
  const [product, data] = await Promise.all([
    loadErpProduct(erpProductId),
    loadPlatformData(),
  ]);
  return { product: product && isApprovedErpProduct(product) ? product : null, data };
}

export interface SkuLookup {
  product: ErpProduct;
  sku: ErpSku;
}

/**
 * 全目录的 SKU 编码索引（批量 / 表格下单按 SKU 找产品用）。
 * 只收审批通过的产品；其每个 SKU 都收。
 */
export async function getSkuIndex(_tier: SellerTier): Promise<Map<string, SkuLookup>> {
  const [products, data] = await Promise.all([loadAllErpProducts(), loadPlatformData()]);
  const index = new Map<string, SkuLookup>();
  for (const product of products) {
    if (!isApprovedErpProduct(product)) continue;
    for (const sku of getListableSkus(product, data)) {
      if (sku.sku) index.set(sku.sku.trim().toUpperCase(), { product, sku });
    }
  }
  return index;
}
