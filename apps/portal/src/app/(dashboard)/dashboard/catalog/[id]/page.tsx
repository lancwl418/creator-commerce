import { notFound } from 'next/navigation';
import CatalogDetail from '@/components/catalog/CatalogDetail';
import { getCatalogProduct } from '@/lib/queries/catalog';
import type { CatalogDetailPageProps } from '@/lib/types/catalog';

export default async function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) notFound();
  return <CatalogDetail key={product.id} product={product} />;
}
