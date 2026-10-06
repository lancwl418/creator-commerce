import type { OrderDetailData } from '@/lib/types/order';

interface OrderStoreSummaryProps { order: OrderDetailData; store: OrderDetailData['creator_store_connections']; totalEarnings: number; }

export default function OrderStoreSummary({ order, store, totalEarnings }: OrderStoreSummaryProps) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Store</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-gray-900 font-medium">{store?.store_name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Platform</span>
            <span className="text-gray-900 capitalize">{store?.platform || '—'}</span>
          </div>
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">${Number(order.subtotal_price).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-900">${Number(order.total_tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-900 font-semibold">Total</span>
            <span className="text-gray-900 font-bold">${Number(order.total_price).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-emerald-600 font-semibold">Your Earnings</span>
            <span className="text-emerald-600 font-bold">${totalEarnings.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </>
  );
}
