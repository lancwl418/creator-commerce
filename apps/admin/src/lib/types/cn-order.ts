export type CnOrderStatus = 'pending_confirmation' | 'confirmed' | 'cancelled';

export interface CnOrderItem {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  quantity: number;
  unit_cost: number;
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

/** cn_bulk_orders 的一行（后台视角，带卖家信息） */
export interface CnOrderRow {
  id: string;
  order_type: 'blank' | 'designed';
  status: CnOrderStatus;
  erp_product_id: string;
  product_title: string;
  items: CnOrderItem[];
  subtotal: number;
  currency: string;
  shipping_address: CnOrderAddress;
  note: string | null;
  design_files: { face: string; design_url: string; preview_url: string | null }[];
  faces: number | null;
  erp_order_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  creators: { id: string; email: string; company_name: string; contact_name: string; phone: string } | null;
}

export interface CnOrdersPageProps {
  searchParams: Promise<{ status?: string }>;
}
