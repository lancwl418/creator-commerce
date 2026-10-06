import type { CatalogFilters, SortKey, CatalogSearchParams } from './types/catalog';

export type { CatalogSearchParams } from './types/catalog';

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePrice(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function parseSort(value: string | null | undefined): SortKey {
  return value === 'price_asc' || value === 'price_desc' ? value : 'newest';
}

export function parseCatalogQuery(params: CatalogSearchParams): CatalogFilters & { page: number } {
  const page = Number(single(params.page));
  return {
    category: single(params.category),
    priceMin: parsePrice(single(params.priceMin)),
    priceMax: parsePrice(single(params.priceMax)),
    sort: parseSort(single(params.sort)),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** 分页/筛选都通过这里生成 URL，避免参数保留规则分叉。 */
export function catalogUrl(params: URLSearchParams, updates: Record<string, string | null>): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '' || (key === 'category' && value === 'all')) next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/products?${query}` : '/products';
}

export function catalogSearchParams(params: CatalogSearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of ['category', 'priceMin', 'priceMax', 'sort', 'page'] as const) {
    const value = single(params[key]);
    if (value) query.set(key, value);
  }
  return query;
}
