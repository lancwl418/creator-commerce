import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getOrders } from '@/lib/queries/orders';
import { ORDER_STATUS_COLORS, FULFILLMENT_STATUS_COLORS } from '@/lib/constants';
import SyncOrdersButton from './SyncOrdersButton';

export default async function OrdersPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const orders = await getOrders(creator.id);

  // Get unique stores for tabs
  const storeMap = new Map<string, { id: string; name: string; platform: string }>();
  for (const order of orders || []) {
    const conn = order.creator_store_connections;
    if (conn && !storeMap.has(conn.id)) {
      storeMap.set(conn.id, { id: conn.id, name: conn.store_name || conn.platform, platform: conn.platform });
    }
  }
  const stores = Array.from(storeMap.values());

  // Calculate totals
  const totalOrders = orders?.length || 0;
  const totalEarnings = (orders || []).reduce((sum, o) => {
    const orderEarnings = (o.creator_order_items || []).reduce(
      (s: number, item: { earnings_amount: number | null }) => s + (item.earnings_amount || 0), 0
    );
    return sum + orderEarnings;
  }, 0);
  const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-gray-500 text-sm mt-1">Orders from your connected stores</p>
        </div>
        <SyncOrdersButton stores={stores} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Earnings</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Store tabs */}
      {stores.length > 1 && (
        <div className="flex gap-2 mb-4">
          <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">All Stores</span>
          {stores.map(store => (
            <span key={store.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {store.name}
            </span>
          ))}
        </div>
      )}

      {/* Orders table */}
      {totalOrders === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
          <p className="text-sm text-gray-500 mt-1">Orders will appear here when customers purchase your products.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Store</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Items</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Earnings</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(orders || []).map(order => {
                const items = order.creator_order_items || [];
                const earnings = items.reduce((s: number, i: { earnings_amount: number | null }) => s + (i.earnings_amount || 0), 0);
                const store = order.creator_store_connections;
                const itemCount = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);

                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/orders/${order.id}`} className="block">
                        <p className="text-sm font-semibold text-primary-600 hover:text-primary-700">{order.shopify_order_name || `#${order.shopify_order_number}`}</p>
                        {order.customer_name && (
                          <p className="text-xs text-gray-400 mt-0.5">{order.customer_name}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700">{store?.store_name || store?.platform || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-sm text-gray-900">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        {items.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {items.map((i: { title: string }) => i.title).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-gray-900">
                        ${Number(order.total_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{order.currency}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-semibold ${earnings > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {earnings > 0 ? `$${earnings.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold w-fit ${
                          ORDER_STATUS_COLORS[order.financial_status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.financial_status || 'unknown'}
                        </span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold w-fit ${
                          FULFILLMENT_STATUS_COLORS[order.fulfillment_status || 'unfulfilled'] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.fulfillment_status || 'unfulfilled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600">
                        {order.order_placed_at
                          ? new Date(order.order_placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
