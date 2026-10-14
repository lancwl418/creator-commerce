import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListableSkus } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { createDesignedOrder } from '@/lib/orders/actions';
import { ERP_TEMPLATE_PREFIX } from '@/lib/products/blank-product';
import { buildSyncVariants } from '@/lib/products/product-sync';
import { getLastShippingAddress } from '@/lib/queries/bulk-orders';
import { getMyProduct } from '@/lib/queries/my-products';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import BulkOrderForm from '@/components/orders/bulk/BulkOrderForm';

export const dynamic = 'force-dynamic';

/** 设计下单：对设计后建好的产品下单 */
export default async function DesignedOrderPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const [row, lastAddress] = await Promise.all([getMyProduct(seller.id, id), getLastShippingAddress(seller.id)]);
  if (!row) notFound();
  const { product, data } = await getProductDetail((row.product_template_id ?? '').replace(ERP_TEMPLATE_PREFIX, ''), seller.tier);
  if (!product) notFound();
  const variants = buildSyncVariants(product, getListableSkus(product, data), 1);
  const moqBySku = Object.fromEntries(variants.map((v) => [v.sku, data.moq.get(v.sku)?.minQty ?? null]));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/my-products" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('nav.myProducts')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('order.designedTitle')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-2">{row.title}</p>
      {row.preview_urls?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.preview_urls[0]} alt="" className="w-28 h-28 rounded-xl border border-border bg-surface-secondary object-contain p-1 mb-6" />
      )}
      {variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{t('sync.noPricedVariants')}</div>
      ) : (
        <BulkOrderForm action={createDesignedOrder} hiddenFields={{ productId: row.id }} variants={variants} moqBySku={moqBySku} defaultAddress={lastAddress} />
      )}
    </div>
  );
}
