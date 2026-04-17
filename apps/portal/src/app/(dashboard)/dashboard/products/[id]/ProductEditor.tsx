'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const COST = 10.00; // Hardcoded production cost for MVP

function erpImg(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/api/')) return path;
  return `/api/erp/image?path=${encodeURIComponent(path)}`;
}

interface ErpSku {
  id: string;
  sku: string;
  price: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inQty: number;
  skuImage: string | null;
}

interface SkuSelection {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
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
  selected_skus: SkuSelection[];
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

  // SKU data from ERP/Shopify
  const [erpSkus, setErpSkus] = useState<ErpSku[]>([]);
  const [optionNames, setOptionNames] = useState<string[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  const [skuError, setSkuError] = useState('');

  // Selection state: set of enabled SKU IDs
  const [enabledSkuIds, setEnabledSkuIds] = useState<Set<string>>(() => {
    const saved = product.selected_skus.filter(s => s.enabled).map(s => s.sku_id);
    return new Set(saved);
  });

  const [retailPrice, setRetailPrice] = useState(
    product.retail_price?.toString() || product.base_price_suggestion?.toString() || '25.00'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fetch SKU data (supports both shopify-xxx and erp-xxx template IDs)
  useEffect(() => {
    async function fetchSkus() {
      try {
        const res = await fetch(`/api/erp/product-skus?template_id=${encodeURIComponent(product.product_template_id)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch SKUs (${res.status})`);
        }
        const data = await res.json();
        setErpSkus(data.skus || []);
        setOptionNames(data.option_names || []);

        // If no saved selections, enable all SKUs by default
        if (product.selected_skus.length === 0 && data.skus?.length > 0) {
          setEnabledSkuIds(new Set(data.skus.map((s: ErpSku) => s.id)));
        }
      } catch (err) {
        setSkuError(err instanceof Error ? err.message : 'Failed to load variants');
      } finally {
        setLoadingSkus(false);
      }
    }
    fetchSkus();
  }, [product.product_template_id]);

  // Derive unique option values from ERP SKUs
  const option1Values = [...new Set(erpSkus.map(s => s.option1).filter(Boolean))] as string[];
  const option2Values = [...new Set(erpSkus.map(s => s.option2).filter(Boolean))] as string[];
  const option3Values = [...new Set(erpSkus.map(s => s.option3).filter(Boolean))] as string[];

  // Determine option labels based on data patterns
  const hasOptions = option1Values.length > 0 || option2Values.length > 0;

  // Active variant selection for preview
  const [selectedOption1, setSelectedOption1] = useState<string | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<string | null>(null);
  const [selectedOption3, setSelectedOption3] = useState<string | null>(null);

  // Auto-select first options when SKUs load
  useEffect(() => {
    if (erpSkus.length > 0) {
      if (option1Values.length > 0 && !selectedOption1) setSelectedOption1(option1Values[0]);
      if (option2Values.length > 0 && !selectedOption2) setSelectedOption2(option2Values[0]);
      if (option3Values.length > 0 && !selectedOption3) setSelectedOption3(option3Values[0]);
    }
  }, [erpSkus]);

  // Find the active SKU image based on selected options
  const activePreviewUrl = useMemo(() => {
    if (erpSkus.length === 0) return previewUrl;

    // Find a SKU matching the selected options that has an image
    const matchingSku = erpSkus.find(sku => {
      const match1 = !selectedOption1 || sku.option1 === selectedOption1;
      const match2 = !selectedOption2 || sku.option2 === selectedOption2;
      const match3 = !selectedOption3 || sku.option3 === selectedOption3;
      return match1 && match2 && match3 && sku.skuImage;
    });

    if (matchingSku?.skuImage) {
      return erpImg(matchingSku.skuImage);
    }

    // Fallback: find any SKU with the selected color (option2) that has an image
    if (selectedOption2) {
      const colorSku = erpSkus.find(sku => sku.option2 === selectedOption2 && sku.skuImage);
      if (colorSku?.skuImage) return erpImg(colorSku.skuImage);
    }

    // Fallback: find any SKU with the selected option1 that has an image
    if (selectedOption1) {
      const opt1Sku = erpSkus.find(sku => sku.option1 === selectedOption1 && sku.skuImage);
      if (opt1Sku?.skuImage) return erpImg(opt1Sku.skuImage);
    }

    return previewUrl;
  }, [erpSkus, selectedOption1, selectedOption2, selectedOption3, previewUrl]);

  const toggleSku = useCallback((skuId: string) => {
    setEnabledSkuIds(prev => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId); else next.add(skuId);
      return next;
    });
    setSaved(false);
  }, []);

  const selectAll = () => {
    setEnabledSkuIds(new Set(erpSkus.map(s => s.id)));
    setSaved(false);
  };

  const clearAll = () => {
    setEnabledSkuIds(new Set());
    setSaved(false);
  };

  const priceNum = parseFloat(retailPrice) || 0;
  const profit = priceNum - COST;
  const margin = priceNum > 0 ? ((profit / priceNum) * 100) : 0;

  async function handleSave() {
    if (priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }
    if (priceNum <= COST) {
      setError(`Price must be higher than cost ($${COST.toFixed(2)})`);
      return;
    }
    if (enabledSkuIds.size === 0) {
      setError('Please select at least one variant');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Build SKU selection entries
      const skuSelections: SkuSelection[] = erpSkus.map(sku => ({
        sku_id: sku.id,
        sku: sku.sku,
        option1: sku.option1,
        option2: sku.option2,
        option3: sku.option3,
        enabled: enabledSkuIds.has(sku.id),
      }));

      const { error: updateError } = await supabase
        .from('sellable_product_instances')
        .update({
          selected_skus: skuSelections,
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
            {activePreviewUrl ? (
              <img src={activePreviewUrl} alt={product.title} className="w-full h-full object-contain p-8" />
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
        {/* Variants */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Variants</h3>
            {erpSkus.length > 0 && (
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Clickable variant selectors */}
          {!loadingSkus && !skuError && hasOptions && (
            <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
              {option1Values.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {optionNames[0] || 'Option 1'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {option1Values.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSelectedOption1(val)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                          selectedOption1 === val
                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-border bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {option2Values.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {optionNames[1] || 'Option 2'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {option2Values.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSelectedOption2(val)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                          selectedOption2 === val
                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-border bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {option3Values.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {optionNames[2] || 'Option 3'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {option3Values.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSelectedOption3(val)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                          selectedOption3 === val
                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-border bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingSkus ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 ml-3">Loading variants from ERP...</span>
            </div>
          ) : skuError ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-700">{skuError}</p>
              <p className="text-xs text-amber-500 mt-1">Variants could not be loaded. You can still set pricing.</p>
            </div>
          ) : erpSkus.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No variants found for this product.</p>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[44px_1fr_1fr_1fr_80px] gap-2 px-2 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <span></span>
                {option1Values.length > 0 && <span>{optionNames[0] || 'Option 1'}</span>}
                {option2Values.length > 0 && <span>{optionNames[1] || 'Option 2'}</span>}
                {option3Values.length > 0 && <span>{optionNames[2] || 'Option 3'}</span>}
                {!hasOptions && <span>SKU</span>}
                <span className="text-right">Stock</span>
              </div>

              {/* SKU rows */}
              <div className="divide-y divide-gray-50">
                {erpSkus.map((sku) => {
                  const enabled = enabledSkuIds.has(sku.id);
                  return (
                    <button
                      key={sku.id}
                      onClick={() => toggleSku(sku.id)}
                      className={`w-full grid grid-cols-[44px_1fr_1fr_1fr_80px] gap-2 items-center px-2 py-3 text-left transition-all rounded-lg ${
                        enabled ? 'bg-white' : 'bg-gray-50 opacity-50'
                      } hover:bg-gray-50`}
                    >
                      {/* Checkbox */}
                      <div className="flex justify-center">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          enabled ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                        }`}>
                          {enabled && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      {option1Values.length > 0 && (
                        <span className="text-sm font-semibold text-gray-900">{sku.option1 || '—'}</span>
                      )}
                      {option2Values.length > 0 && (
                        <span className="text-sm text-gray-700">{sku.option2 || '—'}</span>
                      )}
                      {option3Values.length > 0 && (
                        <span className="text-sm text-gray-700">{sku.option3 || '—'}</span>
                      )}
                      {!hasOptions && (
                        <span className="text-sm font-mono text-gray-600">{sku.sku}</span>
                      )}

                      {/* Stock */}
                      <span className={`text-sm text-right font-medium ${
                        sku.inQty > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {sku.inQty > 0 ? sku.inQty : 'Out'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                {enabledSkuIds.size} of {erpSkus.length} variants selected
              </p>
            </>
          )}
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

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all shadow-md shadow-primary-600/25"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Product'}
          </button>
          <button
            onClick={() => {
              // TODO: implement store sync flow
              alert('Store sync coming soon! Connect your store first in Settings.');
            }}
            className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/25"
          >
            Sync to Your Stores
          </button>
        </div>
      </div>
    </div>
  );
}
