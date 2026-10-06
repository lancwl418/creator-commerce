import type { OrderDetailData } from '@/lib/types/order';

interface OrderFulfillmentsProps { order: OrderDetailData; }

export default function OrderFulfillments({ order }: OrderFulfillmentsProps) {
  return (
    <>
      {(order.creator_order_fulfillments || []).length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Fulfillment</h3>
          {(order.creator_order_fulfillments || []).map(f => (
            <div key={f.id} className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier</span>
                <span className="text-gray-900">{f.carrier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tracking</span>
                {f.tracking_url ? (
                  <a href={f.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium">
                    {f.tracking_number}
                  </a>
                ) : (
                  <span className="text-gray-900">{f.tracking_number}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.status === 'delivered' ? 'bg-emerald-50 text-emerald-700'
                  : f.status === 'shipped' ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>{f.status}</span>
              </div>
              {f.fulfilled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-600 text-xs">{new Date(f.fulfilled_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
