import type { MessageKey } from '@/lib/i18n';
import type { StoreConnection } from '@/lib/types/store';
import { t } from '@/lib/i18n';
import ShopifyStoreCard from './ShopifyStoreCard';

interface StoresPageProps {
  stores: StoreConnection[];
  notice?: MessageKey;
  error?: MessageKey;
}

export default function StoresPage({ stores, notice, error }: StoresPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('stores.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('stores.subtitle')}</p>
      </div>
      {notice && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {t(notice)}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {t(error)}
        </div>
      )}
      <ShopifyStoreCard initialStores={stores} />
      <p className="mt-6 rounded-xl bg-surface-secondary p-4 text-xs text-gray-500">{t('stores.help')}</p>
    </div>
  );
}
