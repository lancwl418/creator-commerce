import OrderActivityLog from './OrderActivityLog';
import OrderFulfillments from './OrderFulfillments';
import OrderStoreSummary from './OrderStoreSummary';
import OrderCustomer from './OrderCustomer';
import OrderItemsTable from './OrderItemsTable';
import OrderHeader from './OrderHeader';
import Link from 'next/link';
import type { OrderDetailData } from '@/lib/types/order';
import { FulfillSection } from './FulfillSection';

export default function OrderDetail({ order }: { order: OrderDetailData }) {
  const items = order.creator_order_items || [];
  const store = order.creator_store_connections;
  const totalEarnings = items.reduce((sum, item) => sum + (item.earnings_amount || 0), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = order.shipping_address;
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/orders" className="hover:text-primary-600 transition-colors">Orders</Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium">{order.shopify_order_name || `#${order.shopify_order_number}`}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order info + Items */}
        <div className="lg:col-span-2 space-y-5">
          <OrderHeader order={order} totalEarnings={totalEarnings} totalItems={totalItems} />
          <OrderItemsTable items={items} />

        </div>

        {/* Right: Customer + Store info */}
        <div className="space-y-5">
          <OrderCustomer order={order} shipping={shipping} />
          <OrderStoreSummary order={order} store={store} totalEarnings={totalEarnings} />
          <OrderFulfillments order={order} />

        </div>
      </div>

      {/* Fulfillment */}
      <div className="mt-6">
        <FulfillSection
          orderId={order.id}
          items={items.map(i => ({
            shopify_line_item_id: i.shopify_line_item_id,
            title: i.title,
            variant_title: i.variant_title,
            sku: i.sku,
          }))}
          fulfillmentStatus={order.fulfillment_status}
        />
      </div>

      <OrderActivityLog order={order} />

    </div>
  );
}
