import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogItem, getListableSkus } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { createUploadedDesignOrder } from '@/lib/orders/actions';
import { getUploadableFaces } from '@/lib/products/print-faces';
import { buildSyncVariants } from '@/lib/products/product-sync';
import { getLastShippingAddress } from '@/lib/queries/bulk-orders';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import BulkOrderForm from '@/components/orders/bulk/BulkOrderForm';

export const dynamic = 'force-dynamic';

/** 上传设计下单：表格里显示的是单面价，最终单价按上传的面数在提交时重新计算。 */
export default async function UploadedDesignOrderPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const [{ product, data }, lastAddress] = await Promise.all([getProductDetail(id, seller.tier), getLastShippingAddress(seller.id)]);
  if (!product) notFound();
  const item = getCatalogItem(product, data);
  if (!item) notFound();
  const faces = getUploadableFaces(product);
  const variants = buildSyncVariants(product, getListableSkus(product, data), 1);
  const moqBySku = Object.fromEntries(variants.map((v) => [v.sku, data.moq.get(v.sku)?.minQty ?? null]));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href={`/products/${id}`} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('sync.back')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('order.uploadTitle')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{item.name}</p>
      {faces.length === 0 || variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{t('sync.noPricedVariants')}</div>
      ) : (
        <BulkOrderForm action={createUploadedDesignOrder} hiddenFields={{ erpProductId: product.id }} variants={variants} moqBySku={moqBySku} defaultAddress={lastAddress} designFaces={faces} />
      )}
    </div>
  );
}
