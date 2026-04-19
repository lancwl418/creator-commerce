export interface OrderData {
  id: string;
  creator_id: string;
  creator_store_connection_id: string;
  shopify_order_id: string;
  shopify_order_number: string;
  shopify_order_name: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: ShippingAddress | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  notes: string | null;
  erp_order_id: string | null;
  erp_sync_status: string;
  order_placed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_price_snapshot: number | null;
  base_cost_snapshot: number | null;
  earnings_amount: number | null;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_line_item_id: string;
  channel_listing_variant_id: string | null;
}

export interface OrderLog {
  id: string;
  action: string;
  source: string;
  changes: Record<string, unknown>;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderFulfillment {
  id: string;
  tracking_number: string;
  tracking_url: string | null;
  carrier: string;
  status: string;
  fulfilled_at: string | null;
  line_item_ids: string[];
}
