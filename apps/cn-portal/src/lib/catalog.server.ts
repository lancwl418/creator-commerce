import {
  fetchProducts,
  findProductById,
  type ErpProduct,
  type SellerTier,
} from '@creator-commerce/shared/erp';
import { erpConfig } from './erp';
import { createClient } from './supabase/server';
import { buildCatalog, type CatalogResult, type PlatformData } from './catalog';

/** 从平台 3 张薄表装配 PlatformData（按当前等级） */
export async function loadPlatformData(tier: SellerTier): Promise<PlatformData> {
  const supabase = await createClient();

  const [visRes, stockRes, moqRes] = await Promise.all([
    supabase
      .from('seller_product_visibility')
      .select('sku, visible')
      .eq('seller_tier', tier)
      .eq('visible', false),
    supabase.from('product_stock_snapshot').select('sku, in_stock'),
    supabase.from('product_moq').select('sku, min_qty, min_amount'),
  ]);

  const hiddenSkusForTier = new Set<string>(
    (visRes.data ?? []).map((r: { sku: string }) => r.sku)
  );

  const stock = new Map<string, boolean>();
  for (const r of (stockRes.data ?? []) as { sku: string; in_stock: boolean }[]) {
    stock.set(r.sku, r.in_stock);
  }

  const moq = new Map<string, { minQty: number | null; minAmount: number | null }>();
  for (const r of (moqRes.data ?? []) as {
    sku: string;
    min_qty: number | null;
    min_amount: number | null;
  }[]) {
    moq.set(r.sku, { minQty: r.min_qty, minAmount: r.min_amount });
  }

  return { hiddenSkusForTier, stock, moq };
}

export interface CatalogPage extends CatalogResult {
  total: number;
  pages: number;
  page: number;
}

/** 选品列表页数据 */
export async function getCatalogPage(
  tier: SellerTier,
  pageNo = 1,
  pageSize = 40
): Promise<CatalogPage> {
  const [page, data] = await Promise.all([
    fetchProducts(erpConfig, pageNo, pageSize),
    loadPlatformData(tier),
  ]);
  const result = buildCatalog(page.records, tier, data);
  return { ...result, total: page.total, pages: page.pages, page: pageNo };
}

/** 详情页原始产品 + 平台数据（价格/库存/MOQ 由页面按等级计算） */
export async function getProductDetail(
  erpProductId: string,
  tier: SellerTier
): Promise<{ product: ErpProduct | null; data: PlatformData }> {
  const [product, data] = await Promise.all([
    findProductById(erpConfig, erpProductId),
    loadPlatformData(tier),
  ]);
  return { product, data };
}
