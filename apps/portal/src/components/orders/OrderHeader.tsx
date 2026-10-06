import type { OrderDetailData } from '@/lib/types/order';
import { ORDER_STATUS_COLORS, FULFILLMENT_STATUS_COLORS } from '@/lib/constants';
import { ResyncButton } from './ResyncButton';

interface OrderHeaderProps { order: OrderDetailData; totalEarnings: number; totalItems: number; }

export default function OrderHeader({ order, totalEarnings, totalItems }: OrderHeaderProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{order.shopify_order_name || `#${order.shopify_order_number}`}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {order.order_placed_at
              ? new Date(order.order_placed_at).toLocaleString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })
              : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResyncButton orderId={order.id} shopifyOrderId={order.shopify_order_id} storeConnectionId={order.creator_store_connection_id} />
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ORDER_STATUS_COLORS[order.financial_status || 'unknown'] || 'bg-gray-100 text-gray-600'
            }`}>
            {order.financial_status || 'unknown'}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${FULFILLMENT_STATUS_COLORS[order.fulfillment_status || 'unfulfilled'] || 'bg-gray-100 text-gray-600'
            }`}>
            {order.fulfillment_status || 'unfulfilled'}
          </span>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">${Number(order.total_price).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Your Earnings</p>
          <p className={`text-lg font-bold mt-0.5 ${totalEarnings > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {totalEarnings > 0 ? `$${totalEarnings.toFixed(2)}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Items</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{totalItems}</p>
        </div>
      </div>
    </div>


  );
}
