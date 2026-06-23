'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { createProductsFromDesignPayload } from '@/lib/products/createFromDesignPayload';
import GhostLoader from '@/components/GhostLoader';

interface CreatedProduct {
  id: string;
  title: string;
  description: string | null;
  status: string;
  base_price_suggestion: number | null;
  preview_urls: string[];
  design_artwork_urls: string[];
  product_template_id: string;
  created_at: string;
}

interface EditState {
  title: string;
  description: string;
  price: string;
}

interface ImportFlowProps {
  creatorId: string;
}

export default function ImportFlow({ creatorId }: ImportFlowProps) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'saving' | 'error' | 'success'>('saving');
  const [error, setError] = useState('');
  const [createdProducts, setCreatedProducts] = useState<CreatedProduct[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    saveProducts();
  }, []);

  function initEdits(products: CreatedProduct[]) {
    const map: Record<string, EditState> = {};
    for (const p of products) {
      map[p.id] = {
        title: p.title || '',
        description: p.description || '',
        price: p.base_price_suggestion ? Number(p.base_price_suggestion).toFixed(2) : '0.00',
      };
    }
    setEdits(map);
  }

  function updateEdit(id: string, field: keyof EditState, value: string) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleQuickSave(id: string) {
    const edit = edits[id];
    if (!edit) return;

    setSavingIds((prev) => new Set(prev).add(id));
    const { error } = await supabase
      .from('sellable_product_instances')
      .update({
        title: edit.title,
        description: edit.description,
        base_price_suggestion: parseFloat(edit.price) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (!error) {
      setSavedIds((prev) => new Set(prev).add(id));
      setCreatedProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, title: edit.title, description: edit.description, base_price_suggestion: parseFloat(edit.price) || null }
            : p
        )
      );
    }
  }

  async function handleSaveAll() {
    setSavingAll(true);
    for (const product of createdProducts) {
      await handleQuickSave(product.id);
    }
    setSavingAll(false);
  }

  async function saveProducts() {
    try {
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem('product_import_payload');
        if (raw) sessionStorage.removeItem('product_import_payload');
      } catch {}

      if (!raw) {
        const hash = window.location.hash.slice(1);
        if (hash) raw = decodeURIComponent(hash);
      }

      if (!raw) { setError('No product data received'); setStatus('error'); return; }

      const payload = JSON.parse(raw);

      if (!payload.products || payload.products.length === 0) { setError('No products to save'); setStatus('error'); return; }

      const created = await createProductsFromDesignPayload(supabase, creatorId, payload);

      if (created.length === 0) { setError('Failed to create any products'); setStatus('error'); return; }

      setCreatedProducts(created);
      initEdits(created);
      setStatus('success');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'saving') {
    return <GhostLoader fullscreen size="lg" />;
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Failed to save products</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => router.push('/dashboard/products')} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors">
          Go to Products
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {createdProducts.length === 1 ? 'Product Created' : `${createdProducts.length} Products Created`}
            </h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Review and edit your products below, then sync to your stores.
          </p>
        </div>
        <Link href="/dashboard/products" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          View All Products
        </Link>
      </div>

      {/* Product cards with quick edit */}
      <div className="space-y-4">
        {createdProducts.map((product) => {
          const previewUrl = (product.preview_urls as string[])?.[0];
          const artworkUrls = (product.design_artwork_urls as string[]) ?? [];
          const edit = edits[product.id];
          const isSaving = savingIds.has(product.id);
          const isSaved = savedIds.has(product.id);

          if (!edit) return null;

          return (
            <div key={product.id} className="relative rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
              {/* Status badge — top right */}
              <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
                {isSaved && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Saved
                  </span>
                )}
                <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">Draft</span>
              </div>
              <div className="flex gap-5 p-5">
                {/* Preview */}
                <div className="w-32 h-32 rounded-xl bg-surface-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt={product.title} className="w-full h-full object-contain p-2" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  )}
                </div>

                {/* Editable fields */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Title */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Name</label>
                    <input
                      type="text"
                      value={edit.title}
                      onChange={(e) => updateEdit(product.id, 'title', e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                  </div>

                  {/* Price + Design row */}
                  <div className="flex gap-4">
                    <div className="w-36">
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Retail Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={edit.price}
                          onChange={(e) => updateEdit(product.id, 'price', e.target.value)}
                          className="w-full rounded-lg border border-border bg-white pl-7 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Design artwork */}
                    {artworkUrls.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Design</label>
                        <div className="flex items-center gap-1.5">
                          {artworkUrls.map((url, i) => (
                            <div key={i} className="w-9 h-9 rounded-md bg-surface-secondary overflow-hidden border border-border-light shrink-0">
                              <img src={url} alt="" className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={edit.description}
                      onChange={(e) => updateEdit(product.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
                      placeholder="Product description..."
                    />
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-end px-5 py-3 bg-surface-secondary border-t border-border-light">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickSave(product.id)}
                    disabled={isSaving}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <Link
                    href={`/dashboard/products/${product.id}?from=import`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-500 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                    Full Edit
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={handleSaveAll}
          disabled={savingAll}
          className="rounded-xl border-2 border-primary-600 px-8 py-3.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors"
        >
          {savingAll ? 'Saving...' : 'Save All'}
        </button>
        <button
          onClick={() => {
            alert('Store sync coming soon! Connect your store first in Settings.');
          }}
          className="rounded-xl bg-primary-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/25"
        >
          Sync to Your Stores
        </button>
      </div>
    </div>
  );
}
