import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getProducts } from '@/lib/queries/products';
import { resolveProductTab } from '@/lib/products/productTabs';
import type { ProductsPageProps } from '@/lib/types/product';
import CreatedProducts from '@/components/products/list/CreatedProducts';

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }
  const { tab } = await searchParams;
  const products = await getProducts(creator.id);
  return <CreatedProducts products={products} activeTab={resolveProductTab(tab)} />;
}
