/** creator_orders 列表行（卖家视角）；订单经 Creator Portal 的 webhook 回流 */
export interface SellerOrderRow {
  id: string;
  shopify_order_name: string | null;
  shopify_order_number: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  total_price: number | null;
  currency: string | null;
  customer_name: string | null;
  order_placed_at: string | null;
  created_at: string;
  creator_store_connections: { store_name: string | null } | null;
  creator_order_items: { id: string; title: string; variant_title: string | null; quantity: number }[] | null;
}
