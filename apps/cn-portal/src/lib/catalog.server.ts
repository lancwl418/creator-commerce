import {
  fetchProducts,
  findProductById,
  type ErpProduct,
  type ErpProductPage,
  type ErpSku,
  type SellerTier,
} from '@creator-commerce/shared/erp';
import { getErpConfig } from './erp';
import { createClient } from './supabase/server';
import { buildCatalog, getCatalogItem, getListableSkus } from './catalog';
import type { CatalogResult, PlatformData, ProductDetailData } from './types/catalog';
import { loadAllRows } from './platform-data';
import { createTtlCache } from './ttl-cache';

// ERP 产品数据与卖家等级无关，可以跨请求共用；等级价格、可见性、库存在其后按请求计算。
const ERP_CACHE_TTL_MS = 5 * 60 * 1000;
const ERP_PAGE_CACHE_ENTRIES = 50;
const ERP_PRODUCT_CACHE_ENTRIES = 1000;
const erpPageCache = createTtlCache<ErpProductPage>(ERP_CACHE_TTL_MS, ERP_PAGE_CACHE_ENTRIES);
const erpProductCache = createTtlCache<ErpProduct | null>(ERP_CACHE_TTL_MS, ERP_PRODUCT_CACHE_ENTRIES);

function loadErpPage(pageNo: number, pageSize: number): Promise<ErpProductPage> {
  return erpPageCache.get(`${pageNo}:${pageSize}`, async () => {
    const page = await fetchProducts(getErpConfig(), pageNo, pageSize);
    // 列表记录与详情接口返回的结构一致，顺带写入详情缓存，从列表点进详情不必再请求 ERP。
    for (const product of page.records) erpProductCache.set(product.id, product);
    return page;
  });
}

function loadErpProduct(erpProductId: string): Promise<ErpProduct | null> {
  return erpProductCache.get(erpProductId, () => findProductById(getErpConfig(), erpProductId));
}

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

// ERP 产品列表接口只有分页参数，不能按业务线筛选；目录要先取回全部产品再在本地筛选、
// 排序和分页。各页走上面的 5 分钟缓存。
const ERP_SCAN_PAGE_SIZE = 100;

async function loadAllErpProducts(): Promise<ErpProduct[]> {
  const first = await loadErpPage(1, ERP_SCAN_PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) =>
      loadErpPage(index + 2, ERP_SCAN_PAGE_SIZE)
    )
  );
  return [first, ...rest].flatMap((page) => page.records);
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
