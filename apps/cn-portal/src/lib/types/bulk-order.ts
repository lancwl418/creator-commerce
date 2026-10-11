export type BulkOrderStatus = 'pending_confirmation' | 'confirmed' | 'cancelled';

export interface BulkOrderItem {
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
  erp_product_id: string;
  product_title: string;
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
