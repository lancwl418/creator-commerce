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
  /** 各色档的空白衣售价（已按等级），key 为色档 id；有值时优先于 blankPrice */
  colorPrices: Record<string, number> | null;
}

export interface ErpPricingGroup {
  name: string; // '零售' | '批发' | 'VIP' | '中国商家'（等级名）
  mode: string; // 'multiplier' 等
  multiplier: number;
  printMode: string;
  printMultiplier: number;
  customerLevelId: string; // 客户等级 FK
  /** 关联的供应商报价 id，对应 product.suppliers[].id */
  supplierQuoteId?: string | null;
  supplierId: string;
  supplierName: string;
  rules: ErpPricingRule[];
  pricingTiers: ErpPricingTier[];
}

/** 变体维度（如颜色、尺码）。options[i] 的值存在 SKU 的 option{i+1} 字段 */
export interface ErpProductOption {
  dimensionCode: string;
  dimensionName?: string | null;
  isSize?: boolean | null;
  isColor?: boolean | null;
}

export interface ErpSupplierColorTier {
  id: string;
  code: string;
  memberColors?: string[] | null;
  /** 该色档的空白件工厂成本（供应商报价）。成本价，只能在服务端/内部后台使用 */
  price?: number | null;
}

export interface ErpSupplierSizeTier {
  /** 档位 id，crafts[].costByTier 以此为 key */
  id?: string;
  code: string;
  memberSizes?: string[] | null;
  colorTiers?: ErpSupplierColorTier[] | null;
  /** 整档统一的空白件工厂成本；色档有自己的 price 时以色档为准 */
  price?: number | null;
}

/**
 * 供应商报价里的工艺成本。costByTier 以尺码档 id 为 key，值里 face_N 是 N 面印花成本，
 * 色档 id 作 key 时是该色档的 face_N 明细（优先于档位级）。
 * 例：{ "<sizeTierId>": { "face_1": 0.8, "<colorTierId>": { "face_1": 0.5 } } }
 */
export interface ErpSupplierCraft {
  id?: string;
  craftId?: string;
  name?: string | null;
  costByTier?: Record<string, Record<string, unknown>> | null;
}

/** 供应商报价里的 SKU 映射：我方 SKU ↔ 工厂编码（推单给工厂时用 factoryCode） */
export interface ErpSupplierSkuMap {
  id?: string;
  /** "颜色|尺码"，如 "Black|S" */
  skuKey: string;
  mySkuCode?: string | null;
  factoryCode?: string | null;
  onSale?: number | null;
}

/**
 * 供应商报价。原始数据含供应商成本价（sizeTiers 的 price、crafts 的 costByTier），
 * 只能在服务端/内部后台使用，不要传给卖家浏览器。
 */
export interface ErpSupplierQuote {
  id: string;
  /** 供应商 id，对应 product.mainSupplierId；ERP 里有少量报价此字段为空串 */
  supplierId?: string | null;
  /** 供应商名称；只在服务端使用，不展示给卖家 */
  name?: string | null;
  sizeTiers?: ErpSupplierSizeTier[] | null;
  crafts?: ErpSupplierCraft[] | null;
  skuMaps?: ErpSupplierSkuMap[] | null;
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
  /** 印刷位置，ERP 以 JSON 字符串返回，如 '["front","back"]' */
  printPositions?: string | string[] | null;
  /** 支持的业务线 code 列表，ERP 以 JSON 字符串返回，如 '["ideamax","chinamerchant"]' */
  prodSupport?: string | string[] | null;
  /**
   * 默认（主）供应商 id，对应 suppliers[].supplierId / pricingGroups[].supplierId。
   * 一个产品有多家供应商报价时，取价只用主供应商的定价组（见 pricing.ts）。
   */
  mainSupplierId?: string | null;
  /** 分级定价组（按客户等级），POD 产品的价格来源 */
  pricingGroups?: ErpPricingGroup[] | null;
  options?: ErpProductOption[] | null;
  suppliers?: ErpSupplierQuote[] | null;
  prodSkuList: ErpSku[];
  prodImageList: ErpProductImage[];
}

export interface ErpProductPage {
  records: ErpProduct[];
  total: number;
  pages: number;
  current: number;
}

// ── 客户档案（接口文档「客户档案」「客户等级分页列表查询」） ──

export interface ErpCustomerLevel {
  id: string;
  /** 等级编码，如 'VIP'、'wholesale'；部分等级为 null */
  levelId: string | null;
  levelName: string;
  multiplier?: number | null;
}

/**
 * 新增客户的请求体。字段名以 ERP 现有客户记录为准（等级字段是 custStageId / vipStage，
 * 示例代码里的 vipStageId 在记录中不存在）。
 */
export interface ErpCustomerCreateInput {
  createBy: string;
  sysOrgCode: string;
  custName: string;
  custContact: string;
  custTel: string;
  custPhone: string;
  custEmail: string;
  custState: 'active' | 'suspended' | 'pending_review';
  custSource: string;
  /** 审核状态，接口文档：默认为 2 */
  status: number;
  custStageId: string;
  vipStage: string;
  [field: string]: string | number | undefined;
}

export interface ErpCustomerCreateResult {
  id: string;
  custId?: string;
  custName?: string;
  message?: string;
}
