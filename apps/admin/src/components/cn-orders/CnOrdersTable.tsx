import type { CnOrderRow } from '@/lib/types/cn-order';
import { OrderStatusActions } from './OrderStatusActions';

const STATUS_STYLES: Record<CnOrderRow['status'], string> = {
  pending_confirmation: 'bg-warning-50 text-warning-600',
  confirmed: 'bg-success-50 text-success-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<CnOrderRow['status'], string> = {
  pending_confirmation: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

function orderTitle(order: CnOrderRow): string {
  if (order.product_title) return order.product_title;
  const titles = [...new Set(order.items.map((item) => item.product_title).filter(Boolean))];
  return titles.length <= 1 ? titles[0] ?? 'Order' : `${titles[0]} + ${titles.length - 1} more`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 单上的设计文件：单产品单在 design_files，批量单在各条目上；按文件地址去重 */
function designGroups(order: CnOrderRow): CnOrderRow['design_files'] {
  const all = [...order.design_files, ...order.items.flatMap((item) => item.design_files ?? [])];
  const seen = new Set<string>();
  return all.filter((file) => !seen.has(file.design_url) && seen.add(file.design_url));
}

export function CnOrdersTable({ orders }: { orders: CnOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-white p-12 text-center">
        <p className="text-sm text-gray-400">No purchase orders</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const a = order.shipping_address;
        const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <div key={order.id} className="rounded-2xl border border-border-light bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{orderTitle(order)}</h3>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{order.order_type === 'blank' ? 'Blank' : 'Designed'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(order.created_at)} · {order.creators?.company_name || order.creators?.email || 'Unknown seller'}
                  {order.creators?.contact_name && ` · ${order.creators.contact_name} ${order.creators.phone}`}
                  {order.product_title && order.items[0]?.supplier_name && ` · ${order.items[0].supplier_name}`}
                </p>
              </div>
              <OrderStatusActions orderId={order.id} status={order.status} />
            </div>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-border-light text-left text-xs text-gray-500">
                  <th className="px-2 py-1.5 font-medium">SKU</th>
                  <th className="px-2 py-1.5 font-medium">Options</th>
                  <th className="px-2 py-1.5 font-medium">Unit</th>
                  <th className="px-2 py-1.5 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={`${item.sku_id}-${index}`} className="border-b border-border-light last:border-0">
                    <td className="px-2 py-1.5 text-gray-800">
                      {item.sku}
                      {(item.faces ?? 0) > 0 && <span className="ml-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">designed ×{item.faces}</span>}
                      {!order.product_title && item.product_title && (
                        <span className="block text-xs text-gray-400">{item.product_title}{item.supplier_name ? ` · ${item.supplier_name}` : ''}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800">{[item.option1, item.option2, item.option3].filter(Boolean).join(' / ')}</td>
                    <td className="px-2 py-1.5 text-gray-800">${Number(item.unit_cost).toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-gray-800">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-right text-gray-500">{quantity} pcs</td>
                  <td className="px-2 py-2 font-semibold text-gray-900">${Number(order.subtotal).toFixed(2)} {order.currency}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-3 text-sm text-gray-700">
              <span className="text-gray-400">Ship to: </span>
              {a.name} · {a.phone} · {[a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean).join(', ')}
            </div>
            {designGroups(order).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {designGroups(order).map((file) => (
                  <div key={file.design_url} className="text-center">
                    {file.preview_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.preview_url} alt="" className="h-20 w-20 rounded-lg border border-border-light object-contain p-1" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg border border-dashed border-border-light flex items-center justify-center text-[11px] text-gray-400">no preview</div>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{file.face}</p>
                    <a href={file.design_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 underline">design file</a>
                  </div>
                ))}
              </div>
            )}
            {order.note && <p className="mt-1 text-sm text-gray-500">Note: {order.note}</p>}
            {order.erp_order_id && <p className="mt-1 text-xs text-gray-400">ERP order #{order.erp_order_id}</p>}
          </div>
        );
      })}
    </div>
  );
}
