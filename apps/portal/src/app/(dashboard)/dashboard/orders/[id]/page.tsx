import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderActions from './OrderActions';

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  pending: 'bg-yellow-50 text-yellow-700',
  refunded: 'bg-red-50 text-red-600',
  voided: 'bg-gray-100 text-gray-500',
};

const fulfillmentColors: Record<string, string> = {
  fulfilled: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  unfulfilled: 'bg-gray-100 text-gray-600',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('creator_orders')
    .select(`
      *,
      creator_store_connections (id, platform, store_name, store_url),
      creator_order_logs (id, action, source, changes, note, created_by, created_at),
      creator_order_fulfillments (id, tracking_number, tracking_url, carrier, status, fulfilled_at),
      creator_order_items (
        id, title, variant_title, sku, quantity,
        unit_price, total_price, sale_price_snapshot,
        base_cost_snapshot, earnings_amount,
        shopify_product_id, shopify_variant_id,
        channel_listing_variant_id,
        channel_listing_variants (
          id, external_variant_id,
          custom_product_skus (
            id, erp_product_id, erp_sku_id, sku_code,
            erp_synced_sku_id, erp_sync_status, preview_image_url
          )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (!order) notFound();

  const items = order.creator_order_items || [];
  const store = order.creator_store_connections;
  const totalEarnings = items.reduce((s: number, i: { earnings_amount: number | null }) => s + (i.earnings_amount || 0), 0);
  const totalItems = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
  const shipping = order.shipping_address as Record<string, string> | null;

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
          {/* Order header */}
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
              <div className="flex gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  statusColors[order.financial_status] || 'bg-gray-100 text-gray-600'
                }`}>
                  {order.financial_status || 'unknown'}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  fulfillmentColors[order.fulfillment_status || 'unfulfilled'] || 'bg-gray-100 text-gray-600'
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

          {/* Line items */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Items</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Product</th>
                  <th className="text-left px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">SKU / IDs</th>
                  <th className="text-center px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Qty</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Price</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Cost</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: {
                  id: string; title: string; variant_title: string | null; sku: string | null;
                  quantity: number; unit_price: number; total_price: number;
                  base_cost_snapshot: number | null; earnings_amount: number | null;
                  shopify_product_id: string | null; shopify_variant_id: string | null;
                  channel_listing_variants: {
                    id: string; external_variant_id: string;
                    custom_product_skus: {
                      id: string; erp_product_id: string; erp_sku_id: string; sku_code: string;
                      erp_synced_sku_id: string | null; erp_sync_status: string;
                      preview_image_url: string | null;
                    };
                  } | null;
                }) => {
                  const customSku = item.channel_listing_variants?.custom_product_skus;
                  const previewImg = customSku?.preview_image_url;
                  return (
                  <tr key={item.id}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {previewImg && (
                          <div className="w-10 h-10 rounded-md border border-border bg-gray-50 overflow-hidden shrink-0">
                            <img src={previewImg} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          {item.variant_title && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.variant_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-gray-600">{item.sku || '—'}</p>
                        <div className="text-[10px] text-gray-400 space-y-0.5">
                          {item.shopify_product_id && <p>Shopify Product: {item.shopify_product_id}</p>}
                          {item.shopify_variant_id && <p>Shopify Variant: {item.shopify_variant_id}</p>}
                          {customSku && (
                            <>
                              <p>Ideamax Product: {customSku.erp_product_id}</p>
                              <p>Ideamax SKU: {customSku.erp_sku_id}</p>
                              {customSku.erp_synced_sku_id && (
                                <p>Custom SKU: {customSku.erp_synced_sku_id}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="text-sm text-gray-700">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-sm text-gray-900">${Number(item.unit_price).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-sm text-gray-500">
                        {item.base_cost_snapshot != null ? `$${Number(item.base_cost_snapshot).toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`text-sm font-semibold ${
                        item.earnings_amount != null && item.earnings_amount > 0 ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {item.earnings_amount != null ? `$${Number(item.earnings_amount).toFixed(2)}` : '—'}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Customer + Store info */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Customer</h3>
            <div className="space-y-2 text-sm">
              {order.customer_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-900 font-medium">{order.customer_name}</span>
                </div>
              )}
              {order.customer_email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{order.customer_email}</span>
                </div>
              )}
            </div>
            {shipping && (shipping.address1 || shipping.city) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Shipping Address</p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {shipping.name && <p className="font-medium text-gray-900">{shipping.name}</p>}
                  {shipping.address1 && <p>{shipping.address1}</p>}
                  {shipping.address2 && <p>{shipping.address2}</p>}
                  <p>
                    {[shipping.city, shipping.province, shipping.zip].filter(Boolean).join(', ')}
                  </p>
                  {shipping.country && <p>{shipping.country}</p>}
                  {shipping.phone && (
                    <p className="text-gray-500 mt-1">{shipping.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Store */}
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

          {/* Actions: Edit + Resync */}
          <OrderActions
            orderId={order.id}
            shopifyOrderId={order.shopify_order_id}
            storeConnectionId={order.creator_store_connection_id}
            currentData={{
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              shipping_address: order.shipping_address as Record<string, string> | null,
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status,
              notes: order.notes,
            }}
          />

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
          {/* Fulfillment */}
          {(order.creator_order_fulfillments || []).length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Fulfillment</h3>
              {(order.creator_order_fulfillments || []).map((f: {
                id: string; tracking_number: string; carrier: string; tracking_url: string | null;
                status: string; fulfilled_at: string | null;
              }) => (
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
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      f.status === 'delivered' ? 'bg-emerald-50 text-emerald-700'
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
        </div>
      </div>

      {/* Activity Log */}
      {(order.creator_order_logs || []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Activity Log</h3>
          <div className="space-y-3">
            {(order.creator_order_logs || [])
              .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((log: {
                id: string; action: string; source: string; note: string | null;
                changes: Record<string, unknown>; created_at: string;
              }) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    log.action === 'created' ? 'bg-emerald-500'
                    : log.action === 'cancelled' ? 'bg-red-500'
                    : log.action === 'fulfilled' ? 'bg-blue-500'
                    : log.action === 'manual_edit' ? 'bg-amber-500'
                    : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      log.source === 'shopify_webhook' ? 'bg-green-50 text-green-600'
                      : log.source === 'manual' ? 'bg-amber-50 text-amber-600'
                      : 'bg-gray-100 text-gray-500'
                    }`}>{log.source.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-gray-500 mt-0.5">{log.note}</p>
                  )}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Changed: {Object.keys(log.changes).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
