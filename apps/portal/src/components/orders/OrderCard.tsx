import type { BuyerOrder } from '@/lib/types/buyer-order';
import FulfillmentBadge from './FulfillmentBadge';
import OrderLineItem from './OrderLineItem';

export default function OrderCard({ order }: { order: BuyerOrder }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900">{order.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FulfillmentBadge status={order.fulfillmentStatus} />
          <span className="text-sm font-bold text-gray-900">
            {order.currency === 'USD' ? '$' : ''}{Number(order.total).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        {order.items.map((item, index) => <OrderLineItem key={index} item={item} />)}
      </div>
      {order.statusUrl && (
        <div className="mt-4 pt-3 border-t border-border-light">
          <a href={order.statusUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-gray-900 underline underline-offset-2 hover:text-brand-600">
            View order status →
          </a>
        </div>
      )}
    </div>
  );
}
