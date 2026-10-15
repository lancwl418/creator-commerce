import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogItem, getListableSkus } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { createDirectOrder } from '@/lib/orders/actions';
import { buildBlankVariants } from '@/lib/products/blank-product';
import { getUploadableFaces } from '@/lib/products/print-faces';
import { buildSyncVariants } from '@/lib/products/product-sync';
import { getLastShippingAddress } from '@/lib/queries/bulk-orders';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import BulkOrderForm from '@/components/orders/bulk/BulkOrderForm';

export const dynamic = 'force-dynamic';

/**
 * 统一下单页：上传设计可选（不传 = 白板），表格显示白板价，设计了 N 面提交时按 N 面重新计价。
 * 没有白板价的产品（pod_only）表格显示单面价，必须上传设计。
 */
export default async function DirectOrderPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const [{ product, data }, lastAddress] = await Promise.all([getProductDetail(id, seller.tier), getLastShippingAddress(seller.id)]);
  if (!product) notFound();
  const item = getCatalogItem(product, data);
  if (!item) notFound();

  const skus = getListableSkus(product, data);
  const faces = getUploadableFaces(product);
  const blankVariants = buildBlankVariants(product, skus);
  const canDesign = faces.length > 0 && buildSyncVariants(product, skus, 1).length > 0;
  const variants = blankVariants.length > 0 ? blankVariants : canDesign ? buildSyncVariants(product, skus, 1) : [];
  const moqBySku = Object.fromEntries(variants.map((v) => [v.sku, data.moq.get(v.sku)?.minQty ?? null]));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href={`/products/${id}`} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('sync.back')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('order.unifiedTitle')}</h1>
      <p className="text-sm text-gray-500 mt-1">{item.name}</p>
      <p className="text-xs text-gray-400 mt-1 mb-6">{t('order.unifiedHint')}</p>
      {variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{t('actions.order.unavailable')}</div>
      ) : (
        <BulkOrderForm
          action={createDirectOrder}
          hiddenFields={{ erpProductId: product.id }}
          variants={variants}
          moqBySku={moqBySku}
          defaultAddress={lastAddress}
          designFaces={canDesign ? faces : undefined}
          designOptional={blankVariants.length > 0}
          allowCart
        />
      )}
    </div>
  );
}
