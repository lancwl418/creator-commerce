// ERP 产品数据契约。平台只读，不改 ERP 结构。
// 字段沿用 ERP 的 camelCase 命名。

export interface ErpSku {
  id: string;
  sku: string;
  price: number | null; // POD 产品此字段为 null，价格在 product.pricingGroups
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inQty: number;
  skuImage: string | null;
}

// ── ERP POD 分级定价模型（内嵌在产品响应的 pricingGroups） ──
// 每个客户等级（零售/批发/VIP）一组，rules[].printPriceJson 存的是
// 已按该等级算好的印花售价，pricingTiers[].blankPrice 是空白衣售价。

export interface ErpPricingRule {
  craftId: string;
  craftName: string;
  /** 已按等级算好的印花售价 JSON，见 pricing.ts 解析 */
  printPriceJson: string | null;
}

export interface ErpPricingTier {
  tierCode: string; // 如 'S~2XL'
  memberSizes: string[]; // 该档覆盖的尺码
  blankPrice: number; // 空白衣售价（已按等级）
  colorPrices: Record<string, number> | null; // 按色档的加价
}

export interface ErpPricingGroup {
  name: string; // '零售' | '批发' | 'VIP'（等级名）
  mode: string; // 'multiplier' 等
  multiplier: number;
  printMode: string;
  printMultiplier: number;
  customerLevelId: string; // 客户等级 FK
  supplierId: string;
  supplierName: string;
  rules: ErpPricingRule[];
  pricingTiers: ErpPricingTier[];
}

export interface ErpProductImage {
  id?: string;
  picSrc: string;
  isMain: number;
  position?: number;
  altText?: string;
}

export interface ErpProduct {
  id: string;
  itemCnName: string;
  itemEnName: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  category?: string;
  categoryName?: string;
  status: number;
  tags: string;
  itemNo: string;
  mainPic: string;
  /** 变体维度名（如 Color / Size）；对应 SKU 上同名字段存的是维度值 */
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  option1Name?: string;
  option2Name?: string;
  option3Name?: string;
  /** 逻辑删除标记，1 = 已删除 */
  delFlag?: number | string | null;
  /** 生产周期（文档 5.2 详情页展示）——以 ERP 实际字段为准 */
  productionTime?: string | number | null;
  /** 发货地 ship from（文档 5.2/7.1 只读展示）——以 ERP 实际字段为准 */
  shipFrom?: string | null;
  weight?: number | null;
  /** 定价模式，如 'pod_only' */
  pricingMode?: string | null;
  /** 分级定价组（按客户等级），POD 产品的价格来源 */
  pricingGroups?: ErpPricingGroup[] | null;
  prodSkuList: ErpSku[];
  prodImageList: ErpProductImage[];
}

export interface ErpProductPage {
  records: ErpProduct[];
  total: number;
  pages: number;
  current: number;
}
