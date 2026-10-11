import type { BulkOrderRow } from '@/lib/types/bulk-order';
import { orderQuantity } from '@/lib/orders/bulk-order';
import { t, type MessageKey } from '@/lib/i18n';
import { faceLabel } from './DesignUploadFields';

export const BULK_STATUS_STYLES: Record<BulkOrderRow['status'], string> = {
  pending_confirmation: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function bulkStatusLabel(status: BulkOrderRow['status']): string {
  return t(`order.status.${status}` as MessageKey);
}

export default function BulkOrderDetail({ order }: { order: BulkOrderRow }) {
  const a = order.shipping_address;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">{t(order.order_type === 'blank' ? 'order.type.blank' : 'order.type.designed')} · {new Date(order.created_at).toLocaleString('zh-CN')}</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-1">{order.product_title}</h2>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BULK_STATUS_STYLES[order.status]}`}>{bulkStatusLabel(order.status)}</span>
        </div>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-border text-left text-xs text-gray-500">
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="px-2 py-2 font-medium">{t('sync.variant.options')}</th>
              <th className="px-2 py-2 font-medium">{t('order.col.unitCost')}</th>
              <th className="px-2 py-2 font-medium">{t('order.col.quantity')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.sku_id} className="border-b border-border last:border-0">
                <td className="px-2 py-2 text-gray-800">{item.sku}</td>
                <td className="px-2 py-2 text-gray-800">{[item.option1, item.option2, item.option3].filter(Boolean).join(' / ')}</td>
                <td className="px-2 py-2 text-gray-800">${Number(item.unit_cost).toFixed(2)}</td>
                <td className="px-2 py-2 text-gray-800">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-2 py-3 text-right text-gray-500">{t('order.quantityTotal', 'zh', { n: orderQuantity(order.items) })}</td>
              <td className="px-2 py-3 font-semibold text-gray-900">${Number(order.subtotal).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {order.design_files.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('order.section.design')}</h3>
          <div className="flex flex-wrap gap-4">
            {order.design_files.map((file) => (
              <div key={file.face} className="text-center">
                {file.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview_url} alt="" className="h-24 w-24 rounded-lg border border-border bg-surface-secondary object-contain p-1" />
                ) : (
                  <div className="h-24 w-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-gray-400">{t('order.upload.noPreview')}</div>
                )}
                <p className="text-xs text-gray-700 mt-1">{faceLabel(file.face)}</p>
                <a href={file.design_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 underline underline-offset-2">{t('order.upload.designFile')}</a>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-white p-5 text-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('order.section.address')}</h3>
        <p className="text-gray-800">{a.name} · {a.phone}</p>
        <p className="text-gray-700">{[a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean).join(', ')}</p>
        {order.note && <p className="mt-3 text-gray-500">{t('order.field.note')}：{order.note}</p>}
      </div>
    </div>
  );
}
