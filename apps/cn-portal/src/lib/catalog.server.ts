import {
  fetchProducts,
  findProductById,
  type SellerTier,
} from '@creator-commerce/shared/erp';
import { getErpConfig } from './erp';
import { createClient } from './supabase/server';
import { buildCatalog } from './catalog';
import type { CatalogPage, PlatformData, ProductDetailData } from './types/catalog';
import { loadAllRows } from './platform-data';

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

/** 选品列表页数据 */
export async function getCatalogPage(
  tier: SellerTier,
  pageNo = 1,
  pageSize = 40
): Promise<CatalogPage> {
  const [page, data] = await Promise.all([
    fetchProducts(getErpConfig(), pageNo, pageSize),
    loadPlatformData(tier),
  ]);
  const result = buildCatalog(page.records, tier, data);
  return { ...result, total: page.total, pages: page.pages, page: pageNo };
}

/** 详情页原始产品 + 平台数据（价格/库存/MOQ 由页面按等级计算） */
export async function getProductDetail(
  erpProductId: string,
  tier: SellerTier
): Promise<ProductDetailData> {
  const [product, data] = await Promise.all([
    findProductById(getErpConfig(), erpProductId),
    loadPlatformData(tier),
  ]);
  return { product, data };
}
