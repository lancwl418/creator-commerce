'use client';

import type { StoreConnection } from '@/lib/types/store';
import { useStoreConnections } from '@/hooks/stores/useStoreConnections';
import { t } from '@/lib/i18n';
import ShopifyConnectForm from './ShopifyConnectForm';

const STATUS_STYLES: Record<StoreConnection['status'], string> = {
  connected: 'bg-green-50 text-green-700',
  disconnected: 'bg-gray-100 text-gray-600',
  expired: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-600',
};

export default function ShopifyStoreCard({ initialStores }: { initialStores: StoreConnection[] }) {
  const { shopify, shopInput, setShopInput, connectShopify, disconnect, disconnecting, error } =
    useStoreConnections(initialStores);
  const isConnected = shopify?.status === 'connected';

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Shopify</h2>
            {shopify && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[shopify.status]}`}>
                {t(`stores.status.${shopify.status}`)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{t('stores.shopify.description')}</p>
        </div>
        {isConnected && (
          <button
            type="button"
            onClick={() => disconnect(shopify.id)}
            disabled={disconnecting === shopify.id}
            className="shrink-0 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            {disconnecting === shopify.id ? t('stores.disconnecting') : t('stores.disconnect')}
          </button>
        )}
      </div>

      {isConnected ? (
        <dl className="mt-4 rounded-xl bg-surface-secondary p-3 text-sm space-y-1.5">
          <div className="flex gap-2">
            <dt className="text-gray-400">{t('stores.field.store')}</dt>
            <dd className="font-medium text-gray-900">{shopify.store_name ?? '—'}</dd>
          </div>
          {shopify.store_url && (
            <div className="flex gap-2">
              <dt className="text-gray-400">{t('stores.field.url')}</dt>
              <dd>
                <a href={shopify.store_url} target="_blank" rel="noopener noreferrer" className="text-gray-900 underline underline-offset-2">
                  {shopify.store_url}
                </a>
              </dd>
            </div>
          )}
          {shopify.connected_at && (
            <div className="flex gap-2">
              <dt className="text-gray-400">{t('stores.field.connectedAt')}</dt>
              <dd className="text-gray-700">{new Date(shopify.connected_at).toLocaleDateString('zh-CN')}</dd>
            </div>
          )}
        </dl>
      ) : (
        <ShopifyConnectForm value={shopInput} onChange={setShopInput} onSubmit={connectShopify} />
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
