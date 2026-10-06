'use client';

import { useCatalog } from '@/hooks/catalog/useCatalog';
import CatalogFilters from './CatalogFilters';
import CatalogProductCard from './CatalogProductCard';
import CatalogPagination from './CatalogPagination';
import CatalogSelectionBar from './CatalogSelectionBar';

export default function Catalog() {
  const { state, search, setSearch, categories, activeCategory, setActiveCategory, filteredProducts,
    selectedIds, selectedCount, toggleSelect, selectAll, clearSelection, fetchProducts,
    handleDesignSingle, handleDesignSelected, busy } = useCatalog();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
          <p className="text-gray-500 text-sm mt-1">
            Browse products and create your own custom versions
          </p>
        </div>
        {state.total > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            {state.total} products
          </span>
        )}
      </div>

      <CatalogFilters search={search} setSearch={setSearch} categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

      {/* Error */}
      {state.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">{state.error}</p>
          <button
            onClick={() => fetchProducts(state.current)}
            className="text-xs text-red-700 font-semibold mt-1 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {state.loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {!state.loading && filteredProducts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
          <p className="text-gray-500">
            {search ? 'No products match your search.' : 'No products available.'}
          </p>
        </div>
      )}

      {!state.loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map(product => (
            <CatalogProductCard key={product.id} product={product} isSelected={selectedIds.has(product.id)} busy={busy} toggleSelect={toggleSelect} handleDesignSingle={handleDesignSingle} />
          ))}
        </div>
      )}

      {!state.loading && <CatalogPagination page={state.current} pages={state.pages} onChange={fetchProducts} />}

      <CatalogSelectionBar selectedCount={selectedCount} allSelected={filteredProducts.every(product => selectedIds.has(product.id))} busy={busy} selectAll={selectAll} clearSelection={clearSelection} handleDesignSelected={handleDesignSelected} />
    </div>
  );
}
