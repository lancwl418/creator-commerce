import type { ErpProduct } from '@creator-commerce/shared/erp/types';

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

export type SortKey = 'newest' | 'price_asc' | 'price_desc';

export interface CatalogFilters {
  category?: string; // 'all' 或空 = 不限
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: SortKey;
}

export interface CatalogSearchParams {
  category?: string | string[];
  priceMin?: string | string[];
  priceMax?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}

export interface CatalogPage extends CatalogResult {
  total: number;
  pages: number;
  page: number;
}

export interface ProductDetailData {
  product: ErpProduct | null;
  data: PlatformData;
}

export interface ProductAttribute {
  label: string;
  value: string;
}

export interface ProductDetailView {
  item: CatalogItem;
  images: string[];
  attributes: ProductAttribute[];
  productionTime: string | number | null;
  shipFrom: string | null;
}

export interface CatalogPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}
