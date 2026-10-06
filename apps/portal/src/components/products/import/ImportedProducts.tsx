'use client';

import Link from 'next/link';
import type { CreatedProductRow } from '@/lib/types/product-import';
import { useImportedProductEdits } from '@/hooks/products/useImportedProductEdits';
import ImportedProductCard from './ImportedProductCard';

export default function ImportedProducts({ products: createdProducts }: { products: CreatedProductRow[] }) {
  const { edits, savingIds, savedIds, savingAll, errors, updateEdit, handleQuickSave, handleSaveAll } = useImportedProductEdits(createdProducts);
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
        {createdProducts.map(product => (
          <ImportedProductCard key={product.id} product={product} edit={edits[product.id]} isSaving={savingAll || savingIds.has(product.id)} isSaved={savedIds.has(product.id)} error={errors[product.id]} updateEdit={updateEdit} handleQuickSave={handleQuickSave} />
        ))}
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
        <Link href={createdProducts.length === 1 ? `/dashboard/products/${createdProducts[0].id}?from=import` : '/dashboard/products'} className="rounded-xl bg-primary-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors">
          {createdProducts.length === 1 ? 'Edit & Publish' : 'View Products to Publish'}
        </Link>
      </div>
    </div>
  );
}
