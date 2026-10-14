import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { type SellerTier, resolveProductTierPrice } from '@creator-commerce/shared/erp/pricing';
import type {
  CatalogItem, CatalogResult, CatalogFilters, CatalogPage, PlatformData,
} from './types/catalog';

export type { CatalogItem, CatalogResult, CatalogFilters, PlatformData, SortKey } from './types/catalog';

/**
 * cn-portal 目录统一按 VIP 价展示 / 计价（VIP 缺价回落「零售」，见 pricing.ts 的 TIER_PRICE_FALLBACK）。
 * 卖家 seller_tier 不参与计价，仅用于 ERP 客户同步。
 */
export const CN_PRICE_TIER: SellerTier = 'VIP';

function getCategory(p: ErpProduct): string {
  return p.category || p.categoryName || p.productType || '';
}

/** 产品可选的 SKU。不再按可见性 / 库存过滤——ERP 返回什么就是什么。 */
export function getListableSkus(product: ErpProduct, _data?: PlatformData): ErpSku[] {
  return product.prodSkuList ?? [];
}

export function getMoqQty(skus: ErpSku[], data: PlatformData): number | null {
  for (const sku of skus) {
    const minQty = data.moq.get(sku.sku)?.minQty;
    if (minQty != null) return minQty;
  }
  return null;
}

/** 组装单个产品的列表项。价格按 VIP 取（缺价回落零售），取不到为 null（照常显示，不隐藏）。 */
export function getCatalogItem(product: ErpProduct, data: PlatformData): CatalogItem {
  const price = resolveProductTierPrice(product, CN_PRICE_TIER);
  const listableSkus = getListableSkus(product, data);

  return {
    id: product.id,
    itemNo: product.itemNo,
    name: product.itemEnName || product.title || product.itemCnName,
    imagePath: product.mainPic || product.prodImageList?.find((i) => i.isMain === 1)?.picSrc || null,
    category: getCategory(product),
    fromPrice: price?.min ?? null,
    maxPrice: price?.max ?? null,
    inStock: true,
    moqQty: getMoqQty(listableSkus, data),
  };
}

/**
 * 把 ERP 产品 + 平台数据组装成选品列表。
 *
 * 不做任何显示限制：ERP 列表接口只返回审核完成的产品，这里原样全显示
 * （不按业务线 / 缺价 / 库存 / SKU 可见性过滤）。价格统一按 VIP（缺价回落零售）。
 */
export function buildCatalog(products: ErpProduct[], data: PlatformData): CatalogResult {
  return { items: products.map((p) => getCatalogItem(p, data)) };
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

/** 把筛选后的列表切成一页；页码超出范围时落到最后一页。 */
export function paginate(items: CatalogItem[], page: number, pageSize: number): CatalogPage {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    total: items.length,
    pages,
    page: current,
  };
}

export function uniqueCategories(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
}
