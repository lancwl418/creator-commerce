// 界面文案字典。中文为主、英文为第二语言（文档 5.3）。
// 产品名称与属性不在此翻译 —— 保持 ERP 英文原文。

export type Locale = 'zh' | 'en';

export const DEFAULT_LOCALE: Locale = 'zh';

const dict = {
  'app.title': { zh: '选品平台', en: 'Product Catalog' },
  'nav.products': { zh: '选品', en: 'Products' },

  // 列表页
  'list.title': { zh: '产品选品', en: 'Browse Products' },
  'list.count': { zh: '共 {n} 件产品', en: '{n} products' },
  'list.empty': { zh: '暂无符合条件的产品', en: 'No products match your filters' },
  'list.loadError': { zh: '产品加载失败', en: 'Failed to load products' },

  // 筛选 / 排序（文档 5.1）
  'filter.category': { zh: '品类', en: 'Category' },
  'filter.category.all': { zh: '全部', en: 'All' },
  'filter.priceRange': { zh: '价格区间', en: 'Price range' },
  'filter.priceMin': { zh: '最低价', en: 'Min' },
  'filter.priceMax': { zh: '最高价', en: 'Max' },
  'filter.inStockOnly': { zh: '仅看有货', en: 'In stock only' },
  'filter.apply': { zh: '筛选', en: 'Apply' },
  'filter.reset': { zh: '重置', en: 'Reset' },
  'sort.label': { zh: '排序', en: 'Sort' },
  'sort.newest': { zh: '新上架', en: 'Newest' },
  'sort.priceAsc': { zh: '价格从低到高', en: 'Price: low to high' },
  'sort.priceDesc': { zh: '价格从高到低', en: 'Price: high to low' },

  // 卡片 / 价格
  'price.from': { zh: '起', en: 'from' },
  'price.unavailable': { zh: '暂无报价', en: 'Price unavailable' },
  'moq.hint': { zh: '{n} 件起订', en: 'MOQ {n}' },

  // 详情页（文档 5.2）
  'detail.attributes': { zh: '产品属性', en: 'Attributes' },
  'detail.price': { zh: '价格', en: 'Price' },
  'detail.productionTime': { zh: '生产周期', en: 'Production time' },
  'detail.shipFrom': { zh: '发货地', en: 'Ship from' },
  'detail.shipFromNote': {
    zh: '发货地址固定，不可修改。',
    en: 'Ship-from address is fixed and cannot be changed.',
  },
  'detail.addToCart': { zh: '加入购物车', en: 'Add to cart' },
  'detail.back': { zh: '返回选品', en: 'Back to products' },
  'detail.notFound': { zh: '产品不存在或已下架', en: 'Product not found or delisted' },

  // 卖家等级
  'tier.VIP': { zh: 'VIP 等级价', en: 'VIP price' },
  'tier.WHOLESALE': { zh: '批发商等级价', en: 'Wholesale price' },
} as const;

export type MessageKey = keyof typeof dict;

export function t(
  key: MessageKey,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>
): string {
  let msg: string = dict[key][locale] ?? dict[key].zh;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}
