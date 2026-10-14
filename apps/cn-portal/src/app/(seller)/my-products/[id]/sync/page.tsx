import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListableSkus } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { syncExistingProduct } from '@/lib/products/actions';
import { ERP_TEMPLATE_PREFIX, buildBlankProductImages } from '@/lib/products/blank-product';
import { buildSyncVariants } from '@/lib/products/product-sync';
import { getConnectedShopifyStore, getMyProduct } from '@/lib/queries/my-products';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import ProductSyncForm from '@/components/products/sync/ProductSyncForm';

export const dynamic = 'force-dynamic';

/** 设计后建好的产品草稿 → 补 variant、售价、图片 → 同步到店铺 */
export default async function MyProductSyncPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const [row, store] = await Promise.all([getMyProduct(seller.id, id), getConnectedShopifyStore(seller.id)]);
  if (!row) notFound();
  const { product, data } = await getProductDetail((row.product_template_id ?? '').replace(ERP_TEMPLATE_PREFIX, ''), seller.tier);
  if (!product) notFound();

  const designed = (row.design_artwork_urls?.length ?? 0) > 0 || (row.preview_urls?.length ?? 0) > 0;
  const variants = buildSyncVariants(product, getListableSkus(product, data), designed ? 1 : false);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/my-products" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('nav.myProducts')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('sync.designedTitle')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{row.title}</p>

      {!store ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600">{t('sync.noStore')}</p>
          <Link href="/stores" className="inline-block mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600">{t('nav.stores')}</Link>
        </div>
      ) : variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{t('sync.noPricedVariants')}</div>
      ) : (
        <ProductSyncForm
          action={syncExistingProduct}
          hiddenFields={{ productId: row.id }}
          defaultTitle={row.title ?? ''}
          defaultDescription={row.description ?? ''}
          defaultRetailPrice={row.retail_price ?? row.base_price_suggestion}
          variants={variants}
          images={buildBlankProductImages(product)}
          previewUrls={row.preview_urls ?? []}
          storeName={store.store_name ?? 'Shopify'}
        />
      )}
    </div>
  );
}
