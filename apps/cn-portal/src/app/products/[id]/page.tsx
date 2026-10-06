import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogItem } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { buildProductDetailView } from '@/lib/catalog-detail';
import { getCurrentSellerTier } from '@/lib/seller';
import type { ProductDetailPageProps } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';
import ProductGallery from '@/components/products/ProductGallery';
import ProductInformation from '@/components/products/ProductInformation';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const tier = await getCurrentSellerTier();
  const { product, data } = await getProductDetail(id, tier);
  if (!product) notFound();
  const item = getCatalogItem(product, tier, data);
  if (!item) notFound();
  const details = buildProductDetailView(product, item, data);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← {t('detail.back')}
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <ProductGallery images={details.images} name={item.name} />
        <ProductInformation details={details} tier={tier} />
      </div>
    </div>
  );
}
