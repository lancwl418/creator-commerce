import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogItem, getListableSkus } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { buildBlankProductImages, buildBlankVariants } from '@/lib/products/blank-product';
import { getConnectedShopifyStore } from '@/lib/queries/my-products';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import ProductSyncForm from '@/components/products/sync/ProductSyncForm';
import { syncBlankProduct } from '@/lib/products/actions';

export const dynamic = 'force-dynamic';

export default async function BlankSyncPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const [{ product, data }, store] = await Promise.all([getProductDetail(id, seller.tier), getConnectedShopifyStore(seller.id)]);
  if (!product) notFound();
  const item = getCatalogItem(product, data);
  if (!item) notFound();
  const variants = buildBlankVariants(product, getListableSkus(product, data));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href={`/products/${id}`} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('sync.back')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('sync.title')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{item.name}</p>

      {!store ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600">{t('sync.noStore')}</p>
          <Link href="/stores" className="inline-block mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600">
            {t('nav.stores')}
          </Link>
        </div>
      ) : variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          {t('actions.sync.blankUnavailable')}
        </div>
      ) : (
        <ProductSyncForm
          action={syncBlankProduct}
          hiddenFields={{ erpProductId: product.id }}
          defaultTitle={item.name}
          defaultDescription={product.description ?? ''}
          variants={variants}
          images={buildBlankProductImages(product)}
          storeName={store.store_name ?? 'Shopify'}
        />
      )}
    </div>
  );
}
