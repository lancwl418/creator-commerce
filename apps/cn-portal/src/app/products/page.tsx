import { getCatalogPage } from '@/lib/catalog.server';
import { getCurrentSellerTier } from '@/lib/seller';
import { applyFilters, uniqueCategories } from '@/lib/catalog';
import { parseCatalogQuery } from '@/lib/catalog-query';
import type { CatalogPage, CatalogPageProps } from '@/lib/types/catalog';
import CatalogProducts from '@/components/products/CatalogProducts';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const tier = await getCurrentSellerTier();
  const filters = parseCatalogQuery(params);
  let catalog: CatalogPage | undefined;
  let errored = false;

  try {
    catalog = await getCatalogPage(tier, filters.page);
  } catch (error) {
    console.error('Failed to load CN catalog', error);
    errored = true;
  }

  const items = catalog?.items ?? [];
  return (
    <CatalogProducts
      tier={tier}
      items={applyFilters(items, filters)}
      categories={uniqueCategories(items)}
      count={items.length}
      errored={errored}
      searchParams={params}
      page={filters.page}
      pages={catalog?.pages ?? 1}
    />
  );
}
