'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  ready: 'bg-blue-50 text-blue-600',
  listed: 'bg-success-50 text-success-600',
  paused: 'bg-warning-50 text-warning-600',
  archived: 'bg-gray-100 text-gray-400',
};

interface Product {
  id: string;
  title: string;
  status: string;
  retail_price: number | null;
  cost: number | null;
  created_at: string;
  preview_urls: string[] | null;
  design_title: string | null;
  template_name: string | null;
  listing_count: number;
}

export function CreatorProducts({ creatorId, totalCount }: { creatorId: string; totalCount: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    const from = (page - 1) * PAGE_SIZE;

    supabase
      .from('sellable_product_instances')
      .select('id, title, status, retail_price, cost, created_at, preview_urls, designs(title), channel_listings(id)')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .then(({ data }) => {
        const mapped = (data || []).map((p) => {
          const design = Array.isArray(p.designs) ? p.designs[0] : p.designs;
          const listings = Array.isArray(p.channel_listings) ? p.channel_listings : [];
          return {
            id: p.id,
            title: p.title || 'Untitled Product',
            status: p.status,
            retail_price: p.retail_price,
            cost: p.cost,
            created_at: p.created_at,
            preview_urls: p.preview_urls as string[] | null,
            design_title: (design as { title?: string })?.title || null,
            template_name: null,
            listing_count: listings.length,
          };
        });
        setProducts(mapped);
        setLoading(false);
      });
  }, [creatorId, page]);

  function fmtPrice(n: number | null) {
    if (n == null) return '-';
    return `$${n.toFixed(2)}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Products
          <span className="text-sm font-normal text-gray-400 ml-2">{totalCount}</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No products</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border-light">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-hover transition-colors">
                {/* Preview */}
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {product.preview_urls && product.preview_urls.length > 0 ? (
                    <img src={product.preview_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.template_name && (
                      <span className="text-xs text-gray-400">{product.template_name}</span>
                    )}
                    {product.design_title && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400 truncate">{product.design_title}</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Price */}
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-sm font-medium text-gray-900">{fmtPrice(product.retail_price)}</p>
                  {product.cost != null && (
                    <p className="text-[11px] text-gray-400">cost {fmtPrice(product.cost)}</p>
                  )}
                </div>
                {/* Listings */}
                <div className="hidden sm:block shrink-0 text-center w-12">
                  <p className="text-sm font-medium text-gray-900">{product.listing_count}</p>
                  <p className="text-[10px] text-gray-400">listings</p>
                </div>
                {/* Status */}
                <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[product.status] || 'bg-gray-100 text-gray-500'}`}>
                  {product.status}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-border-light flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        p === page ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
