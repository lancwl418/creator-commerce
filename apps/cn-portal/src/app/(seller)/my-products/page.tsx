import { getMyProducts } from '@/lib/queries/my-products';
import { requireSeller } from '@/lib/sellers/session';
import type { MyProductsPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import MyProductsList from '@/components/products/MyProductsList';

export const dynamic = 'force-dynamic';

export default async function MyProductsPage({ searchParams }: MyProductsPageProps) {
  const seller = await requireSeller();
  const [products, params] = await Promise.all([getMyProducts(seller.id), searchParams]);
  const synced = Array.isArray(params.synced) ? params.synced[0] : params.synced;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('myProducts.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('myProducts.subtitle')}</p>
      </div>
      {synced && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {t('myProducts.synced')}
        </div>
      )}
      <MyProductsList products={products} highlightId={synced} />
    </div>
  );
}
