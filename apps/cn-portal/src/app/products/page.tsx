import Link from 'next/link';
import { getCatalogPage } from '@/lib/catalog.server';
import { getCurrentSellerTier } from '@/lib/seller';
import { applyFilters, uniqueCategories, type SortKey } from '@/lib/catalog';
import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';
import FilterBar from './FilterBar';

export const dynamic = 'force-dynamic';

interface SearchParams {
  category?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tier = await getCurrentSellerTier();
  const pageNo = Math.max(1, Number(sp.page ?? '1') || 1);

  let errored = false;
  let catalog;
  try {
    catalog = await getCatalogPage(tier, pageNo);
  } catch {
    errored = true;
  }

  const allItems = catalog?.items ?? [];
  const categories = uniqueCategories(allItems);
  const items = applyFilters(allItems, {
    category: sp.category,
    priceMin: sp.priceMin ? Number(sp.priceMin) : null,
    priceMax: sp.priceMax ? Number(sp.priceMax) : null,
    sort: (sp.sort as SortKey) ?? 'newest',
  });

  const pages = catalog?.pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t(`tier.${tier}`)}</p>
        </div>
        {allItems.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            {t('list.count', 'zh', { n: allItems.length })}
          </span>
        )}
      </div>

      <FilterBar categories={categories} />

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
          {items.map((item) => {
            const img = erpImage(item.imagePath);
            return (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="group rounded-2xl border-2 border-border bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={item.name}
                      className="w-full h-full object-contain p-4"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">No image</span>
                  )}
                </div>
                <div className="p-3">
                  {/* 产品名保持英文原文（文档 5.3） */}
                  <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-primary-700">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {item.itemNo}
                  </p>
                  <div className="mt-2">
                    {item.fromPrice != null ? (
                      <span className="text-sm font-semibold text-gray-800">
                        ${item.fromPrice.toFixed(2)}
                        <span className="text-[10px] text-gray-400 ml-0.5">
                          {t('price.from')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {t('price.unavailable')}
                      </span>
                    )}
                  </div>
                  {item.moqQty != null && (
                    <span className="inline-block mt-2 rounded-md bg-brand-50 px-2 py-0.5 text-[10px] text-brand-600 font-medium">
                      {t('moq.hint', 'zh', { n: item.moqQty })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <PageLink sp={sp} page={pageNo - 1} disabled={pageNo <= 1} label="上一页" />
          <span className="text-sm text-gray-500 px-3">
            {pageNo} / {pages}
          </span>
          <PageLink
            sp={sp}
            page={pageNo + 1}
            disabled={pageNo >= pages}
            label="下一页"
          />
        </div>
      )}
    </div>
  );
}

function PageLink({
  sp,
  page,
  disabled,
  label,
}: {
  sp: SearchParams;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-300 cursor-not-allowed">
        {label}
      </span>
    );
  }
  const params = new URLSearchParams();
  if (sp.category) params.set('category', sp.category);
  if (sp.priceMin) params.set('priceMin', sp.priceMin);
  if (sp.priceMax) params.set('priceMax', sp.priceMax);
  if (sp.sort) params.set('sort', sp.sort);
  params.set('page', String(page));
  return (
    <Link
      href={`/products?${params.toString()}`}
      className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {label}
    </Link>
  );
}
