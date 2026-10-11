export type BulkOrderStatus = 'pending_confirmation' | 'confirmed' | 'cancelled';

export interface BulkOrderItem {
  /** 多产品采购单时每条自带产品信息 */
  erp_product_id?: string;
  product_title?: string;
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  quantity: number;
  /** 下单时的单价快照（该等级的空白件价） */
  unit_cost: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  address1: string;
  address2: string;
  zip: string;
}

/** 上传设计下单时每一面的文件 */
export interface DesignFile {
  face: string;
  design_url: string;
  preview_url: string | null;
}

/** cn_bulk_orders 的一行（卖家视角） */
export interface BulkOrderRow {
  id: string;
  order_type: 'blank' | 'designed';
  status: BulkOrderStatus;
  /** 单产品采购单才有；多产品时为 null，产品信息看 items[] */
  erp_product_id: string | null;
  product_title: string | null;
  items: BulkOrderItem[];
  subtotal: number;
  currency: string;
  shipping_address: ShippingAddress;
  note: string | null;
  design_files: DesignFile[];
  faces: number | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface BulkOrderInput {
  items: BulkOrderItem[];
  shippingAddress: ShippingAddress;
  note: string;
}

export interface BulkOrderFormState {
  error?: string;
  /** 提交失败时回填地址 */
  address?: Partial<ShippingAddress>;
}

export interface BulkOrderPageProps {
  params: Promise<{ id: string }>;
}

/** cn_cart_items 的一行 */
export interface CartItemRow {
  id: string;
  erp_product_id: string;
  product_title: string;
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  quantity: number;
}

/** 购物车里一条带当前单价的行；unit_cost 为 null 表示该 SKU 现在没有可用报价或已下架 */
export interface PricedCartItem extends CartItemRow {
  unit_cost: number | null;
}

/** 表格下单解析后的一组（一张采购单） */
export interface ImportedOrderGroup {
  ref: string;
  items: BulkOrderItem[];
  address: ShippingAddress | null;
  note: string;
  errors: string[];
}

export interface ImportFormState {
  error?: string;
  /** 解析预览；没有错误时可确认提交 */
  groups?: ImportedOrderGroup[];
  /** 原始 CSV，确认时随表单回传重新解析 */
  csv?: string;
  address?: Partial<ShippingAddress>;
}
