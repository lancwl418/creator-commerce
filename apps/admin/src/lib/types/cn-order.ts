export type CnOrderStatus = 'pending_confirmation' | 'confirmed' | 'cancelled';

export interface CnOrderItem {
  erp_product_id?: string;
  product_title?: string;
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  quantity: number;
  unit_cost: number;
  /** 批量单里带设计的条目：该行的设计文件和面数 */
  design_files?: { face: string; design_url: string; preview_url: string | null }[] | null;
  faces?: number;
  /** 下单时产品默认供应商的显示名快照 */
  supplier_name?: string | null;
}

export interface CnOrderAddress {
  name: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  address1: string;
  address2: string;
  zip: string;
}

/** 推送前运营选定的工厂，按产品记录在 cn_bulk_orders.push_suppliers */
export interface PushSupplierSelection {
  supplier_id: string | null;
  supplier_name: string;
  quote_id: string;
}

/** cn_bulk_orders 的一行（后台视角，带卖家信息） */
export interface CnOrderRow {
  id: string;
  order_number: number;
  order_type: 'blank' | 'designed';
  status: CnOrderStatus;
  erp_product_id: string | null;
  product_title: string | null;
  items: CnOrderItem[];
  subtotal: number;
  currency: string;
  shipping_address: CnOrderAddress;
  note: string | null;
  design_files: { face: string; design_url: string; preview_url: string | null }[];
  faces: number | null;
  erp_order_id: string | null;
  push_suppliers: Record<string, PushSupplierSelection>;
  confirmed_at: string | null;
  created_at: string;
  creators: { id: string; email: string; company_name: string; contact_name: string; phone: string } | null;
}

/** 格式化订单号：CN1000 */
export function formatCnOrderNumber(orderNumber: number): string {
  return `CN${orderNumber}`;
}

/** 推送预处理：一个产品的候选工厂（含按本单数量算好的成本） */
export interface SupplierOptionView {
  quoteId: string;
  supplierId: string | null;
  /** 真实工厂名（ERP 原名）——Admin 内部用真名 */
  name: string;
  /** 对卖家展示的昵称（cn_supplier_settings 自定义名），与真名不同时才有值 */
  nickname: string | null;
  /** 是否产品默认（主）供应商 */
  isMain: boolean;
  /** 该工厂做本单此产品的总成本 Σ 单价 × 数量；报价覆盖不全时为 null */
  total: number | null;
  /** 报价没覆盖到的条目数 */
  missingItems: number;
}

/** 推送预处理：订单里一个产品的工厂比价 + 当前选择 */
export interface ProductPushPrep {
  erpProductId: string;
  productTitle: string;
  options: SupplierOptionView[];
  /** push_suppliers 里已保存的选择（quote_id） */
  selectedQuoteId: string | null;
  /** 下单时快照的默认供应商显示名 */
  snapshotSupplierName: string | null;
}

/** orderId → 该单各产品的工厂比价 */
export type OrderPushPrepMap = Record<string, ProductPushPrep[]>;

export interface CnOrdersPageProps {
  searchParams: Promise<{ status?: string }>;
}
