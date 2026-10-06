'use client';

import { useCatalogFilters } from '@/hooks/products/useCatalogFilters';
import { t } from '@/lib/i18n';

export default function CatalogFilters({ categories }: { categories: string[] }) {
  const { activeCategory, sort, priceMin, priceMax, updateFilters, resetFilters } = useCatalogFilters();

  return (
    <div className="space-y-3 mb-6">
      {/* 品类 pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {['all', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilters({ category: cat })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat === 'all' ? t('filter.category.all') : cat}
            </button>
          ))}
        </div>
      )}

      {/* 价格区间 + 排序 */}
      <form
        key={`${priceMin}:${priceMax}`}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const min = String(form.get('priceMin') ?? '');
          const max = String(form.get('priceMax') ?? '');
          updateFilters({ priceMin: min || null, priceMax: max || null });
        }}
      >
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">
            {t('filter.priceRange')}
          </label>
          <div className="flex items-center gap-2">
            <input
              name="priceMin"
              type="number"
              min="0"
              step="0.01"
              defaultValue={priceMin}
              placeholder={t('filter.priceMin')}
              className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <span className="text-gray-400">–</span>
            <input
              name="priceMax"
              type="number"
              min="0"
              step="0.01"
              defaultValue={priceMax}
              placeholder={t('filter.priceMax')}
              className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">
            {t('sort.label')}
          </label>
          <select
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="newest">{t('sort.newest')}</option>
            <option value="price_asc">{t('sort.priceAsc')}</option>
            <option value="price_desc">{t('sort.priceDesc')}</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          {t('filter.apply')}
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('filter.reset')}
        </button>
      </form>
    </div>
  );
}
