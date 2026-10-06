import type { OrderDetailData } from '@/lib/types/order';

interface OrderActivityLogProps { order: OrderDetailData; }

export default function OrderActivityLog({ order }: OrderActivityLogProps) {
  return (
    <>
      {(order.creator_order_logs || []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Activity Log</h3>
          <div className="space-y-3">
            {[...(order.creator_order_logs || [])]
              .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(log => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="shrink-0 mt-0.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${log.action === 'created' ? 'bg-emerald-500'
                      : log.action === 'cancelled' ? 'bg-red-500'
                        : log.action === 'fulfilled' ? 'bg-blue-500'
                          : log.action === 'manual_edit' ? 'bg-amber-500'
                            : 'bg-gray-400'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${log.source === 'shopify_webhook' ? 'bg-green-50 text-green-600'
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
    </>
  );
}
