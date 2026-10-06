import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { type SellerTier, resolveProductTierPrice } from '@creator-commerce/shared/erp/pricing';
import type { CatalogItem, CatalogResult, CatalogFilters, MissingPriceProduct, PlatformData } from './types/catalog';

export type { CatalogItem, CatalogResult, CatalogFilters, MissingPriceProduct, PlatformData, SortKey } from './types/catalog';

function getCategory(p: ErpProduct): string {
  return p.category || p.categoryName || p.productType || '';
}

function isStockKnownInStock(sku: string, data: PlatformData): boolean {
  // 引导态：还没有任何库存快照 → 不做库存过滤，全部按有货处理
  if (data.stock.size === 0) return true;
  return data.stock.get(sku) === true;
}

/** 列表和详情共用同一套 SKU 可见性/库存规则。 */
export function getListableSkus(product: ErpProduct, data: PlatformData): ErpSku[] {
  return (product.prodSkuList ?? []).filter(
    (sku) => !data.hiddenSkusForTier.has(sku.sku) && isStockKnownInStock(sku.sku, data)
  );
}

export function getMoqQty(skus: ErpSku[], data: PlatformData): number | null {
  for (const sku of skus) {
    const minQty = data.moq.get(sku.sku)?.minQty;
    if (minQty != null) return minQty;
  }
  return null;
}

export function getCatalogItem(
  product: ErpProduct,
  tier: SellerTier,
  data: PlatformData
): CatalogItem | null {
  const price = resolveProductTierPrice(product, tier);
  const listableSkus = getListableSkus(product, data);
  if (!price || listableSkus.length === 0) return null;

  return {
    id: product.id,
    itemNo: product.itemNo,
    name: product.itemEnName || product.title || product.itemCnName,
    imagePath: product.mainPic || product.prodImageList?.find((i) => i.isMain === 1)?.picSrc || null,
    category: getCategory(product),
    fromPrice: price.min,
    maxPrice: price.max,
    inStock: true,
    moqQty: getMoqQty(listableSkus, data),
  };
}

/**
 * 把 ERP 产品 + 平台数据组装成选品列表。
 *
 * 规则（文档 4.1 / 4.2 / 4.4）：
 *  - 分层取价：产品在该等级缺价 → 不显示，且记入缺价清单；
 *  - 可见性：该等级下被隐藏的 SKU 不计入（缺行=可见）；
 *  - 库存：无货 SKU 不计入（无货产品不出现在列表）；
 *  - 产品在「有 ≥1 个 可见 + 有货 的 SKU」且「该等级有价」时才上架，
 *    from 价取该等级价格区间的最低值。
 */
export function buildCatalog(
  products: ErpProduct[],
  tier: SellerTier,
  data: PlatformData
): CatalogResult {
  const items: CatalogItem[] = [];
  const missingPriceProducts: MissingPriceProduct[] = [];

  for (const p of products) {
    const item = getCatalogItem(p, tier, data);
    if (item) {
      items.push(item);
      continue;
    }
    // 该等级下的价格（POD 为产品+等级级）
    const price = resolveProductTierPrice(p, tier);
    if (price == null) {
      missingPriceProducts.push({
        productId: p.id,
        itemNo: p.itemNo,
        productName: p.itemEnName || p.title,
      });
      continue; // 缺价 → 不显示
    }
  }

  return { items, missingPriceProducts };
}

// ── 列表筛选 / 排序（文档 5.1，在已组装的 items 上做） ──
export function applyFilters(
  items: CatalogItem[],
  filters: CatalogFilters
): CatalogItem[] {
  let out = items;

  if (filters.category && filters.category !== 'all') {
    out = out.filter((i) => i.category === filters.category);
  }
  const { priceMin, priceMax } = filters;
  if (priceMin != null) {
    out = out.filter((i) => i.fromPrice != null && i.fromPrice >= priceMin);
  }
  if (priceMax != null) {
    out = out.filter((i) => i.fromPrice != null && i.fromPrice <= priceMax);
  }

  const sort = filters.sort ?? 'newest';
  if (sort === 'price_asc') {
    out = [...out].sort((a, b) => (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity));
  } else if (sort === 'price_desc') {
    out = [...out].sort((a, b) => (b.fromPrice ?? -Infinity) - (a.fromPrice ?? -Infinity));
  }
  // 'newest' 保持 ERP 返回顺序

  return out;
}

export function uniqueCategories(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
}
