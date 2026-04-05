'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending_review: 'bg-warning-50 text-warning-600',
  approved: 'bg-blue-50 text-blue-600',
  published: 'bg-success-50 text-success-600',
  rejected: 'bg-danger-50 text-danger-600',
  archived: 'bg-gray-100 text-gray-400',
};

interface Design {
  id: string;
  title: string;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  design_assets: { file_url: string; asset_type: string }[] | null;
}

export function CreatorDesigns({ creatorId, totalCount }: { creatorId: string; totalCount: number }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    const from = (page - 1) * PAGE_SIZE;

    supabase
      .from('designs')
      .select('id, title, status, category, created_at, updated_at, design_versions!design_versions_design_id_fkey(design_assets(file_url, asset_type))')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .then(({ data }) => {
        const mapped = (data || []).map((d) => {
          const versions = (d as unknown as { design_versions: { design_assets: { file_url: string; asset_type: string }[] }[] }).design_versions || [];
          const allAssets = versions.flatMap(v => v.design_assets || []);
          const artworks = allAssets.filter(a => a.asset_type === 'artwork');
          return {
            id: d.id,
            title: d.title,
            status: d.status,
            category: d.category,
            created_at: d.created_at,
            updated_at: d.updated_at,
            design_assets: artworks.length > 0 ? artworks : null,
          };
        });
        setDesigns(mapped);
        setLoading(false);
      });
  }, [creatorId, page]);

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Designs
          <span className="text-sm font-normal text-gray-400 ml-2">{totalCount}</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : designs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No designs</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border-light">
            {designs.map((design) => (
              <div key={design.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-hover transition-colors">
                {/* Thumbnail */}
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {design.design_assets?.[0]?.file_url ? (
                    <img
                      src={design.design_assets[0].file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{design.title}</p>
                  <p className="text-xs text-gray-400">
                    {design.category && <span className="mr-2">{design.category}</span>}
                    {new Date(design.created_at).toLocaleDateString()}
                  </p>
                </div>
                {/* Status */}
                <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[design.status] || 'bg-gray-100 text-gray-500'}`}>
                  {design.status.replace('_', ' ')}
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
