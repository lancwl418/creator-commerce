import { getCatalog } from '@/lib/catalog.server';
import { requireSeller } from '@/lib/sellers/session';
import { applyFilters, paginate, uniqueCategories } from '@/lib/catalog';
import { parseCatalogQuery } from '@/lib/catalog-query';
import type { CatalogItem, CatalogPageProps } from '@/lib/types/catalog';
import CatalogProducts from '@/components/products/CatalogProducts';

export const dynamic = 'force-dynamic';

const CATALOG_PAGE_SIZE = 40;

export default async function ProductsPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { tier } = await requireSeller();
  const filters = parseCatalogQuery(params);
  let items: CatalogItem[] = [];
  let errored = false;

  try {
    items = (await getCatalog(tier)).items;
  } catch (error) {
    console.error('Failed to load CN catalog', error);
    errored = true;
  }

  const page = paginate(applyFilters(items, filters), filters.page, CATALOG_PAGE_SIZE);
  return (
    <CatalogProducts
      tier={tier}
      items={page.items}
      categories={uniqueCategories(items)}
      count={page.total}
      errored={errored}
      searchParams={params}
      page={page.page}
      pages={page.pages}
    />
  );
}
