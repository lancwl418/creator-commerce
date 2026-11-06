// 工厂推单的统一输入（适配器无关），移植自 order-workbench src/lib/suppliers/types.ts。
// RIIN 和 Linmiao 是同一种 POD 协议：MD5(body + "::" + secretKey) 签名，
// goodsList 带 size/color/style 编码 + imageList（type1 打印图 / type2 效果图）。

/** cn_factory_suppliers 的一行 */
export interface FactorySupplierRow {
  id: string;
  erp_supplier_id: string | null;
  key: string;
  name: string;
  adapter_type: 'riin' | 'linmiao';
  base_url: string | null;
  console_url: string | null;
  secret_key_env: string;
  platform_type: number;
  enabled: boolean;
}

export interface FactoryConsignee {
  name: string;
  phone: string;
  address: string;
  addressOptional?: string;
  country: string;
  province: string;
  city: string;
  district?: string;
  town?: string;
  postCode?: string;
}

export interface FactoryOrderItemInput {
  /** 条目标识，拼 image code 用（只能字母数字下划线） */
  orderItemId: string;
  title: string;
  quantity: number;
  price: number;
  ourSku: string | null;
  factorySku: string;
  sizeCode: string;
  sizeName: string;
  colorCode: string;
  colorName: string;
  styleCode: string;
  styleName: string;
  craftType: 1 | 2; // 1=白墨烫画（默认），2=白墨直喷
  shouldPrint: boolean;
  printPosition?: '1' | '2' | '1,2';
  printImageUrls: string[];
  effectImageUrls: string[];
}

export interface FactoryOrderInput {
  /** 我方生成的工厂侧单号（每次推送唯一），用 CN<order_number>-<factory key> */
  platformOid: string;
  /** 源单 id */
  sourceOrderId: string;
  consignee: FactoryConsignee;
  orderTime: Date;
  sellerRemark?: string;
  items: FactoryOrderItemInput[];
}

export interface FactoryOrderResult {
  platformOid: string;
  traceId?: string;
  /** true = 已推进工厂生产；只下单到待推送时为 false */
  pushed: boolean;
  pushError?: string;
  raw?: unknown;
}

/** 一次推送（一张单 × 一家工厂）的结果，返回给界面展示 */
export interface FactoryPushOutcome {
  factoryKey: string;
  factoryName: string;
  platformOid: string;
  ok: boolean;
  error?: string;
}

/** RIIN 订单状态枚举（Linmiao 同协议） */
export const FACTORY_ORDER_STATUS: Record<number, string> = {
  1: '店铺审核中',
  2: '店铺推送中',
  3: '反审回电商',
  4: '工厂审核',
  5: '生产中',
  12: '已发货',
  13: '已关闭',
  14: '退款中',
  15: '已退款',
};

/**
 * 工厂把产品编码拼成 styleCode-colorCode-sizeCode。没有单独 style code 时
 * 从 factory SKU（如 "A3-grey-M"）剥掉末尾的颜色/尺码段作为款号。
 */
export function deriveStyleCode(factorySku: string, colorCode: string, sizeCode: string): string {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');
  const targets = [norm(colorCode), norm(sizeCode)].filter(Boolean);
  const parts = factorySku.trim().split('-');
  while (parts.length > 1 && targets.includes(norm(parts[parts.length - 1]))) {
    parts.pop();
  }
  return parts.join('-') || factorySku.trim();
}

/**
 * 白板条目的 "[不打印]" 标记仍需要一个可访问的 imageUrl（Linmiao 对空 url 报
 * 「图片url不能为空」）。优先用条目自己的图，兜底用占位图。
 */
export function noPrintMarkerUrl(item: { effectImageUrls: string[]; printImageUrls: string[] }): string {
  return (
    item.effectImageUrls[0] ??
    item.printImageUrls[0] ??
    process.env.BLANKS_PLACEHOLDER_IMAGE_URL ??
    'https://placehold.co/200x200.png'
  );
}

/** yyyy-MM-dd HH:mm:ss —— 两家工厂 API 都要求的时间格式 */
export function formatOrderTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
