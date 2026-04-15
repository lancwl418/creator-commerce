'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

interface ErpProduct {
  id: string;
  itemCnName: string;
  itemEnName: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  status: number;
  tags: string;
  itemNo: string;
  mainPic: string;
  prodSkuList: { id: string; price: number; option1: string; option2: string }[];
  prodImageList: { picSrc: string; isMain: number }[];
}

interface CatalogState {
  products: ErpProduct[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string;
}

export default function CatalogPage() {
  const router = useRouter();
  const [state, setState] = useState<CatalogState>({
    products: [],
    total: 0,
    page: 1,
    pages: 1,
    loading: true,
    error: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchProducts = useCallback(async (pageNo: number) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fetch(`/api/erp/products?pageNo=${pageNo}&pageSize=40`);
      if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
      const data = await res.json();

      const result = data.result ?? data.data ?? data;
      const records: ErpProduct[] = result.records ?? result.list ?? [];
      const total = result.total ?? records.length;
      const pages = result.pages ?? Math.ceil(total / 40);

      setState({
        products: records,
        total,
        page: pageNo,
        pages,
        loading: false,
        error: '',
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load products',
      }));
    }
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    const visible = filteredProducts.map((p) => p.id);
    setSelectedIds((prev) => {
      const allSelected = visible.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        visible.forEach((id) => next.delete(id));
      } else {
        visible.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleDesignSelected() {
    if (selectedIds.size === 0) return;

    const selected = state.products.filter((p) => selectedIds.has(p.id));
    const templateIds = selected.map((p) => `erp-${p.id}`).join(',');
    const productsMeta = encodeURIComponent(
      JSON.stringify(
        selected.map((p) => ({
          id: `erp-${p.id}`,
          name: p.itemEnName || p.title || p.itemCnName,
          base_cost: p.prodSkuList?.[0]?.price ?? 0,
          source: 'erp',
          thumbnail: p.mainPic
            ? `/api/erp/image?path=${encodeURIComponent(p.mainPic)}`
            : null,
        }))
      )
    );

    const callbackUrl = `${window.location.origin}/dashboard/products/import`;

    const editorUrl =
      `${DESIGN_ENGINE_URL}/embed` +
      `?templates=${encodeURIComponent(templateIds)}` +
      `&products_meta=${productsMeta}` +
      `&callback_url=${encodeURIComponent(callbackUrl)}`;

    window.location.href = editorUrl;
  }

  function getImageUrl(product: ErpProduct): string | null {
    if (product.mainPic) {
      return `/api/erp/image?path=${encodeURIComponent(product.mainPic)}`;
    }
    const mainImg = product.prodImageList?.find((img) => img.isMain === 1);
    if (mainImg?.picSrc) {
      return `/api/erp/image?path=${encodeURIComponent(mainImg.picSrc)}`;
    }
    return null;
  }

  // Extract unique categories from productType
  const categories = ['all', ...Array.from(
    new Set(state.products.map((p) => p.productType).filter(Boolean))
  )];

  // Filter
  const filteredProducts = state.products.filter((p) => {
    if (activeCategory !== 'all' && p.productType !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.itemEnName || '').toLowerCase().includes(q) ||
        (p.itemCnName || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.itemNo || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedCount = selectedIds.size;

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

      {/* Search + Categories */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-border text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {state.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">{state.error}</p>
          <button
            onClick={() => fetchProducts(state.page)}
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
          {filteredProducts.map((product) => {
            const imgUrl = getImageUrl(product);
            const isSelected = selectedIds.has(product.id);
            const price = product.prodSkuList?.[0]?.price;
            const skuCount = product.prodSkuList?.length ?? 0;

            return (
              <button
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`group relative rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                    : 'border-transparent hover:border-gray-200 hover:shadow-md'
                } ${!isSelected ? 'border-border' : ''}`}
              >
                {/* Checkbox */}
                <div
                  className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 transition-all ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </div>

                {/* Image */}
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.itemEnName || product.title}
                      className="w-full h-full object-contain p-4"
                      loading="lazy"
                    />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                      />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {product.itemEnName || product.title || product.itemCnName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {product.itemNo}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {price != null && (
                      <span className="text-xs font-semibold text-gray-700">
                        ${Number(price).toFixed(2)}
                      </span>
                    )}
                    {skuCount > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {skuCount} variant{skuCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {product.productType && (
                    <span className="inline-block mt-2 rounded-md bg-surface-secondary px-2 py-0.5 text-[10px] text-gray-500 font-medium">
                      {product.productType}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!state.loading && state.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => fetchProducts(state.page - 1)}
            disabled={state.page <= 1}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {state.page} of {state.pages}
          </span>
          <button
            onClick={() => fetchProducts(state.page + 1)}
            disabled={state.page >= state.pages}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Sticky bottom bar when items selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] z-30 bg-white/95 backdrop-blur-md border-t border-border shadow-lg px-6 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold">
                {selectedCount}
              </span>
              <span className="text-sm text-gray-700 font-medium">
                product{selectedCount > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium ml-1"
              >
                {filteredProducts.every((p) => selectedIds.has(p.id))
                  ? 'Deselect all'
                  : 'Select all visible'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Clear
              </button>
            </div>
            <button
              onClick={handleDesignSelected}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
            >
              Design & Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
