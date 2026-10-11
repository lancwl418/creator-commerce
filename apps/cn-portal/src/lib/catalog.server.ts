import type { ErpProduct, ErpSku, SellerTier } from '@creator-commerce/shared/erp';
import { createClient } from './supabase/server';
import { buildCatalog, getCatalogItem, getListableSkus } from './catalog';
import type { CatalogResult, PlatformData, ProductDetailData } from './types/catalog';
import { loadAllRows } from './platform-data';
import { loadAllErpProducts, loadErpProduct } from './erp-products.server';

/** 从平台 3 张薄表装配 PlatformData（按当前等级） */
export async function loadPlatformData(tier: SellerTier): Promise<PlatformData> {
  const supabase = await createClient();

  const [visibilityRows, stockRows, moqRows] = await Promise.all([
    loadAllRows<{ sku: string }>('seller_product_visibility', (from, to) =>
      supabase
        .from('seller_product_visibility')
        .select('sku, visible')
        .eq('seller_tier', tier)
        .eq('visible', false)
        .order('sku')
        .range(from, to)
    ),
    loadAllRows<{ sku: string; in_stock: boolean }>('product_stock_snapshot', (from, to) =>
      supabase
        .from('product_stock_snapshot')
        .select('sku, in_stock')
        .order('sku')
        .range(from, to)
    ),
    loadAllRows<{ sku: string; min_qty: number | null; min_amount: number | null }>(
      'product_moq', (from, to) =>
        supabase
          .from('product_moq')
          .select('sku, min_qty, min_amount')
          .order('sku')
          .range(from, to)
    ),
  ]);

  const hiddenSkusForTier = new Set<string>(
    visibilityRows.map((r) => r.sku)
  );

  const stock = new Map<string, boolean>();
  for (const r of stockRows) {
    stock.set(r.sku, r.in_stock);
  }

  const moq = new Map<string, { minQty: number | null; minAmount: number | null }>();
  for (const r of moqRows) {
    moq.set(r.sku, { minQty: r.min_qty, minAmount: r.min_amount });
  }

  return { hiddenSkusForTier, stock, moq };
}

/** 该等级卖家可选的全部产品（未筛选、未分页） */
export async function getCatalog(tier: SellerTier): Promise<CatalogResult> {
  const [products, data] = await Promise.all([
    loadAllErpProducts(),
    loadPlatformData(tier),
  ]);
  return buildCatalog(products, tier, data);
}

/** 详情页原始产品 + 平台数据（价格/库存/MOQ 由页面按等级计算） */
export async function getProductDetail(
  erpProductId: string,
  tier: SellerTier
): Promise<ProductDetailData> {
  const [product, data] = await Promise.all([
    loadErpProduct(erpProductId),
    loadPlatformData(tier),
  ]);
  return { product, data };
}

export interface SkuLookup {
  product: ErpProduct;
  sku: ErpSku;
}

/**
 * 全目录的 SKU 编码索引（批量 / 表格下单按 SKU 找产品用）。
 * 只收开放给中国卖家、且该等级可上架（可见、有货、有价）的 SKU。
 */
export async function getSkuIndex(tier: SellerTier): Promise<Map<string, SkuLookup>> {
  const [products, data] = await Promise.all([loadAllErpProducts(), loadPlatformData(tier)]);
  const index = new Map<string, SkuLookup>();
  for (const product of products) {
    if (!getCatalogItem(product, tier, data)) continue;
    for (const sku of getListableSkus(product, data)) {
      if (sku.sku) index.set(sku.sku.trim().toUpperCase(), { product, sku });
    }
  }
  return index;
}
