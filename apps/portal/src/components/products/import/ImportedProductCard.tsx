import Image from 'next/image';
import Link from 'next/link';
import ProductStatusBadge from '@/components/products/ProductStatusBadge';
import type { CreatedProductRow, ImportedProductEdit } from '@/lib/types/product-import';

interface ImportedProductCardProps {
  product: CreatedProductRow;
  edit: ImportedProductEdit;
  isSaving: boolean;
  isSaved: boolean;
  error?: string;
  updateEdit: (id: string, field: keyof ImportedProductEdit, value: string) => void;
  handleQuickSave: (id: string) => void;
}

export default function ImportedProductCard({ product, edit, isSaving, isSaved, error, updateEdit, handleQuickSave }: ImportedProductCardProps) {
  const previewUrl = product.preview_urls?.[0];
  const artworkUrls = product.design_artwork_urls ?? [];
  return (
    <div className="relative rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
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
        <ProductStatusBadge status={product.status} />
      </div>
      <div className="flex gap-5 p-5">
        {/* Preview */}
        <div className="w-32 h-32 rounded-xl bg-surface-secondary flex items-center justify-center overflow-hidden shrink-0">
          {previewUrl ? (
            <Image unoptimized width={128} height={128} src={previewUrl} alt={product.title} className="w-full h-full object-contain p-2" />
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
              disabled={isSaving}
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
                  disabled={isSaving}
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
                      <Image unoptimized width={128} height={128} src={url} alt="" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea disabled={isSaving}
              value={edit.description}
              onChange={(e) => updateEdit(product.id, 'description', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
              placeholder="Product description..."
            />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="px-5 pb-3 text-sm text-red-600">{error}</p>}
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
}
