import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogItem, getListableSkus } from '@/lib/catalog';
import { buildBlankVariants } from '@/lib/products/blank-product';
import { buildSyncVariants } from '@/lib/products/product-sync';
import { getUploadableFaces } from '@/lib/products/print-faces';
import { getProductDetail } from '@/lib/catalog.server';
import { buildProductDetailView } from '@/lib/catalog-detail';
import { requireSeller } from '@/lib/sellers/session';
import type { ProductDetailPageProps } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';
import ProductGallery from '@/components/products/ProductGallery';
import ProductInformation from '@/components/products/ProductInformation';
import VariantPriceTables from '@/components/products/VariantPriceTables';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const { tier } = await requireSeller();
  const { product, data } = await getProductDetail(id, tier);
  if (!product) notFound();
  const item = getCatalogItem(product, data);
  if (!item) notFound();
  const details = buildProductDetailView(product, item, data);
  const listableSkus = getListableSkus(product, data);
  const canOrderBlank = buildBlankVariants(product, listableSkus).length > 0;
  const canOrderDesigned = getUploadableFaces(product).length > 0 && buildSyncVariants(product, listableSkus, 1).length > 0;
  const canOrder = canOrderBlank || canOrderDesigned;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← {t('detail.back')}
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <ProductGallery images={details.images} name={item.name} />
        <ProductInformation details={details} tier={tier} canOrder={canOrder} />
      </div>
      <VariantPriceTables tables={details.priceTables} />
    </div>
  );
}
