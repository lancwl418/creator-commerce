interface OrderItemWithEarnings {
  earnings_amount: number | null;
  quantity?: number;
}

interface OrderWithItems {
  total_price: number | string;
  creator_order_items?: OrderItemWithEarnings[];
}

/** Sum earnings across all items in an order */
export function calculateOrderEarnings(items: OrderItemWithEarnings[]): number {
  return items.reduce((sum, item) => sum + (item.earnings_amount || 0), 0);
}

/** Sum item quantities in an order */
export function calculateOrderItemCount(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Aggregate totals across multiple orders */
export function aggregateOrderTotals(orders: OrderWithItems[]) {
  let totalRevenue = 0;
  let totalEarnings = 0;

  for (const order of orders) {
    totalRevenue += Number(order.total_price) || 0;
    totalEarnings += calculateOrderEarnings(order.creator_order_items || []);
  }

  return {
    totalOrders: orders.length,
    totalRevenue,
    totalEarnings,
  };
}
