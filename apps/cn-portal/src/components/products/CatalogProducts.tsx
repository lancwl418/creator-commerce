import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import type { CatalogItem, CatalogSearchParams } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';
import CatalogFilters from './CatalogFilters';
import ProductCard from './ProductCard';
import ProductPagination from './ProductPagination';

interface CatalogProductsProps {
  tier: SellerTier;
  items: CatalogItem[];
  categories: string[];
  count: number;
  errored: boolean;
  searchParams: CatalogSearchParams;
  page: number;
  pages: number;
}

export default function CatalogProducts({
  tier, items, categories, count, errored, searchParams, page, pages,
}: CatalogProductsProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t(`tier.${tier}`)}</p>
        </div>
        {count > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            {t('list.count', 'zh', { n: count })}
          </span>
        )}
      </div>
      <CatalogFilters categories={categories} />
      {errored && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">{t('list.loadError')}</p>
        </div>
      )}
      {!errored && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
          <p className="text-gray-500">{t('list.empty')}</p>
        </div>
      )}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => <ProductCard key={item.id} item={item} />)}
        </div>
      )}
      <ProductPagination searchParams={searchParams} page={page} pages={pages} />
    </div>
  );
}
