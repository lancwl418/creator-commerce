'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Default sizes and colors for MVP
const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const AVAILABLE_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Forest Green', hex: '#166534' },
];

const COST = 10.00; // Hardcoded production cost for MVP

interface SkuEntry {
  size: string;
  color: string;
  enabled: boolean;
}

interface Listing {
  id: string;
  channel_type: string;
  price: number;
  currency: string;
  status: string;
  error_message?: string;
}

interface ProductData {
  id: string;
  title: string;
  status: string;
  cost: number;
  retail_price: number | null;
  selected_skus: SkuEntry[];
  design_id: string;
  design_version_id: string;
  product_template_id: string;
  base_price_suggestion: number | null;
  created_at: string;
}

interface ProductEditorProps {
  product: ProductData;
  previewUrl: string | null;
  designTitle: string | null;
  listings: Listing[];
}

export default function ProductEditor({ product, previewUrl, designTitle, listings }: ProductEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  // Initialize selected sizes and colors from saved SKUs or defaults
  const savedSizes = new Set(product.selected_skus.filter(s => s.enabled).map(s => s.size));
  const savedColors = new Set(product.selected_skus.filter(s => s.enabled).map(s => s.color));

  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(
    savedSizes.size > 0 ? savedSizes : new Set(AVAILABLE_SIZES)
  );
  const [selectedColors, setSelectedColors] = useState<Set<string>>(
    savedColors.size > 0 ? savedColors : new Set(['Black', 'White'])
  );
  const [retailPrice, setRetailPrice] = useState(
    product.retail_price?.toString() || product.base_price_suggestion?.toString() || '25.00'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const priceNum = parseFloat(retailPrice) || 0;
  const profit = priceNum - COST;
  const margin = priceNum > 0 ? ((profit / priceNum) * 100) : 0;
  const totalVariants = selectedSizes.size * selectedColors.size;

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size); else next.add(size);
      return next;
    });
    setSaved(false);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color); else next.add(color);
      return next;
    });
    setSaved(false);
  };

  const selectAllSizes = () => { setSelectedSizes(new Set(AVAILABLE_SIZES)); setSaved(false); };
  const clearAllSizes = () => { setSelectedSizes(new Set()); setSaved(false); };

  async function handleSave() {
    if (priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }
    if (priceNum <= COST) {
      setError(`Price must be higher than cost ($${COST.toFixed(2)})`);
      return;
    }
    if (selectedSizes.size === 0) {
      setError('Please select at least one size');
      return;
    }
    if (selectedColors.size === 0) {
      setError('Please select at least one color');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Build SKU entries
      const skus: SkuEntry[] = [];
      for (const color of AVAILABLE_COLORS) {
        for (const size of AVAILABLE_SIZES) {
          skus.push({
            size,
            color: color.name,
            enabled: selectedSizes.has(size) && selectedColors.has(color.name),
          });
        }
      }

      const { error: updateError } = await supabase
        .from('sellable_product_instances')
        .update({
          selected_skus: skus,
          retail_price: priceNum,
          cost: COST,
          status: product.status === 'draft' ? 'ready' : product.status,
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    ready: 'bg-blue-50 text-blue-700',
    listed: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Preview + Info */}
      <div className="lg:col-span-2 space-y-4">
        {/* Preview Image */}
        <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="aspect-square bg-surface-secondary flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt={product.title} className="w-full h-full object-contain p-8" />
            ) : (
              <span className="text-gray-400 text-sm">No preview</span>
            )}
          </div>
        </div>

        {/* Product Info Card */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{product.title || 'Untitled'}</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles[product.status] || statusStyles.draft}`}>
                {product.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Design</span>
              <Link href={`/dashboard/designs/${product.design_id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                {designTitle || '—'}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">{new Date(product.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Channel Listings */}
        {listings.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Channel Listings</h3>
            <div className="space-y-2">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between rounded-xl bg-surface-secondary p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {listing.channel_type === 'marketplace' ? 'Marketplace' : 'Creator Store'}
                    </p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${statusStyles[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                      {listing.status}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900">${Number(listing.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Edit Form */}
      <div className="lg:col-span-3 space-y-5">
        {/* Sizes */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Sizes</h3>
            <div className="flex gap-2">
              <button onClick={selectAllSizes} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={clearAllSizes} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SIZES.map((size) => {
              const active = selectedSizes.has(size);
              return (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`
                    min-w-[56px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${active
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                    }
                  `}
                >
                  {size}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {selectedSizes.size} of {AVAILABLE_SIZES.length} sizes selected
          </p>
        </div>

        {/* Colors */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Colors</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABLE_COLORS.map((color) => {
              const active = selectedColors.has(color.name);
              return (
                <button
                  key={color.name}
                  onClick={() => toggleColor(color.name)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
                    ${active
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }
                  `}
                >
                  <span
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: color.hex,
                      borderColor: active
                        ? (color.hex === '#FFFFFF' ? '#d1d5db' : color.hex)
                        : '#d1d5db',
                    }}
                  />
                  <span className="text-sm font-medium">{color.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {selectedColors.size} of {AVAILABLE_COLORS.length} colors selected
          </p>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Pricing</h3>

          <div className="space-y-4">
            {/* Cost */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Production Cost</p>
                <p className="text-xs text-gray-400">Fixed cost per unit</p>
              </div>
              <p className="text-lg font-bold text-gray-900">${COST.toFixed(2)}</p>
            </div>

            {/* Retail Price Input */}
            <div>
              <label htmlFor="retail-price" className="block text-sm font-medium text-gray-700 mb-2">
                Your Selling Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">$</span>
                <input
                  id="retail-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={retailPrice}
                  onChange={(e) => { setRetailPrice(e.target.value); setSaved(false); }}
                  className="w-full rounded-xl border border-border pl-9 pr-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Profit Breakdown */}
            <div className={`rounded-xl p-5 ${profit > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Your Profit per Unit</span>
                <span className={`text-2xl font-bold ${profit > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ${profit.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Margin</span>
                <span className={`text-sm font-semibold ${profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200/50 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Selling Price</span>
                  <span>${priceNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Production Cost</span>
                  <span>-${COST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700 pt-1">
                  <span>= You Earn</span>
                  <span>${profit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-surface-secondary p-3">
              <p className="text-2xl font-bold text-gray-900">{totalVariants}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Variants</p>
            </div>
            <div className="rounded-xl bg-surface-secondary p-3">
              <p className="text-2xl font-bold text-gray-900">{selectedSizes.size}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sizes</p>
            </div>
            <div className="rounded-xl bg-surface-secondary p-3">
              <p className="text-2xl font-bold text-gray-900">{selectedColors.size}</p>
              <p className="text-xs text-gray-500 mt-0.5">Colors</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all shadow-md shadow-primary-600/25"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Product'}
          </button>
          <Link
            href="/dashboard/products"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
