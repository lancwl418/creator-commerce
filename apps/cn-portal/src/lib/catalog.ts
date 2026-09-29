import {
  type ErpProduct,
  type SellerTier,
  resolveProductTierPrice,
} from '@creator-commerce/shared/erp';

// ── 平台侧数据（来自 3 张薄表，见 migration 023） ──
export interface PlatformData {
  /** (sku, tier) → visible。缺行视为可见（文档 4.2：初始全开） */
  hiddenSkusForTier: Set<string>;
  /** sku → 有货。空 Map 视为「首次库存导入前」的引导态，不做库存过滤 */
  stock: Map<string, boolean>;
  /** sku → 起订量 */
  moq: Map<string, { minQty: number | null; minAmount: number | null }>;
}

export interface CatalogItem {
  id: string;
  itemNo: string;
  name: string; // 英文原文（文档 5.3）
  imagePath: string | null; // ERP 原始路径，页面再拼图片代理 URL
  category: string;
  fromPrice: number | null; // 该等级最低价（起）
  maxPrice: number | null; // 该等级最高价
  inStock: boolean;
  moqQty: number | null;
}

// POD 定价是「产品 + 等级」级（SKU 无独立价），缺价清单按产品记
export interface MissingPriceProduct {
  productId: string;
  itemNo: string;
  productName: string;
}

export interface CatalogResult {
  items: CatalogItem[];
  /** 该等级下缺价的产品（进后台缺价清单，文档 4.1） */
  missingPriceProducts: MissingPriceProduct[];
}

function getCategory(p: ErpProduct): string {
  return p.category || p.categoryName || p.productType || '';
}

function isStockKnownInStock(sku: string, data: PlatformData): boolean {
  // 引导态：还没有任何库存快照 → 不做库存过滤，全部按有货处理
  if (data.stock.size === 0) return true;
  return data.stock.get(sku) === true;
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

    // 可上架 SKU：未隐藏 + 有货
    const listableSkus = (p.prodSkuList ?? []).filter(
      (sku) =>
        !data.hiddenSkusForTier.has(sku.sku) && isStockKnownInStock(sku.sku, data)
    );
    if (listableSkus.length === 0) continue; // 全隐藏/无货 → 产品不出现

    // 起订量：取该产品下第一个有 MOQ 配置的 SKU
    let moqQty: number | null = null;
    for (const sku of listableSkus) {
      const m = data.moq.get(sku.sku);
      if (m?.minQty != null) {
        moqQty = m.minQty;
        break;
      }
    }

    const mainImg =
      p.mainPic || p.prodImageList?.find((i) => i.isMain === 1)?.picSrc || null;

    items.push({
      id: p.id,
      itemNo: p.itemNo,
      name: p.itemEnName || p.title || p.itemCnName,
      imagePath: mainImg,
      category: getCategory(p),
      fromPrice: price.min,
      maxPrice: price.max,
      inStock: true, // 能进列表即有货
      moqQty,
    });
  }

  return { items, missingPriceProducts };
}

// ── 列表筛选 / 排序（文档 5.1，在已组装的 items 上做） ──
export type SortKey = 'newest' | 'price_asc' | 'price_desc';

export interface CatalogFilters {
  category?: string; // 'all' 或空 = 不限
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: SortKey;
}

export function applyFilters(
  items: CatalogItem[],
  filters: CatalogFilters
): CatalogItem[] {
  let out = items;

  if (filters.category && filters.category !== 'all') {
    out = out.filter((i) => i.category === filters.category);
  }
  if (filters.priceMin != null) {
    out = out.filter((i) => i.fromPrice != null && i.fromPrice >= filters.priceMin!);
  }
  if (filters.priceMax != null) {
    out = out.filter((i) => i.fromPrice != null && i.fromPrice <= filters.priceMax!);
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
