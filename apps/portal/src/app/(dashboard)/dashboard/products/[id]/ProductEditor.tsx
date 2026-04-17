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
  price?: number | null;
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
  description: string;
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
  designArtworkUrls: string[];
  listings: Listing[];
}

export default function ProductEditor({ product, previewUrl, designTitle, designArtworkUrls, listings }: ProductEditorProps) {
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

  // Editable product fields
  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Product-level retail price (default for all variants)
  const [retailPrice, setRetailPrice] = useState(
    product.retail_price?.toString() || product.base_price_suggestion?.toString() || '25.00'
  );

  // Per-variant price overrides: sku_id -> price string (empty = use product price)
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of product.selected_skus) {
      if (s.price != null) map[s.sku_id] = s.price.toString();
    }
    return map;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fetch SKU data
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

  // Derive unique option values
  const option1Values = [...new Set(erpSkus.map(s => s.option1).filter(Boolean))] as string[];
  const option2Values = [...new Set(erpSkus.map(s => s.option2).filter(Boolean))] as string[];
  const option3Values = [...new Set(erpSkus.map(s => s.option3).filter(Boolean))] as string[];
  const hasOptions = option1Values.length > 0 || option2Values.length > 0;

  // Extract unique color variants with images (one per color)
  const colorVariants = useMemo(() => {
    const seen = new Set<string>();
    const variants: { color: string; imageUrl: string }[] = [];
    for (const sku of erpSkus) {
      const color = sku.option1 || sku.option2;
      if (!color || !sku.skuImage || seen.has(color)) continue;
      seen.add(color);
      variants.push({ color, imageUrl: erpImg(sku.skuImage) });
    }
    return variants;
  }, [erpSkus]);

  // Always show the design preview — this is a created product page,
  // not the catalog. The previewUrl is the composited design from the editor.
  const activePreviewUrl = previewUrl;

  const toggleSku = useCallback((skuId: string) => {
    setEnabledSkuIds(prev => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId); else next.add(skuId);
      return next;
    });
    setSaved(false);
  }, []);

  const selectAll = () => { setEnabledSkuIds(new Set(erpSkus.map(s => s.id))); setSaved(false); };
  const clearAll = () => { setEnabledSkuIds(new Set()); setSaved(false); };

  // Get effective price for a variant
  const getVariantPrice = useCallback((skuId: string): number => {
    const override = variantPrices[skuId];
    if (override !== undefined && override !== '') return parseFloat(override) || 0;
    return parseFloat(retailPrice) || 0;
  }, [variantPrices, retailPrice]);

  const setVariantPrice = useCallback((skuId: string, value: string) => {
    setVariantPrices(prev => ({ ...prev, [skuId]: value }));
    setSaved(false);
  }, []);

  // Apply product price to all variants (clear overrides)
  const applyPriceToAll = useCallback(() => {
    setVariantPrices({});
    setSaved(false);
  }, []);

  const priceNum = parseFloat(retailPrice) || 0;
  const profit = priceNum - COST;
  const margin = priceNum > 0 ? ((profit / priceNum) * 100) : 0;
  const hasCustomPrices = Object.keys(variantPrices).some(k => variantPrices[k] !== '');

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
      const skuSelections: SkuSelection[] = erpSkus.map(sku => {
        const override = variantPrices[sku.id];
        const hasOverride = override !== undefined && override !== '';
        return {
          sku_id: sku.id,
          sku: sku.sku,
          option1: sku.option1,
          option2: sku.option2,
          option3: sku.option3,
          enabled: enabledSkuIds.has(sku.id),
          price: hasOverride ? (parseFloat(override) || null) : null,
        };
      });

      const { error: updateError } = await supabase
        .from('sellable_product_instances')
        .update({
          title: title.trim() || product.title,
          description: description.trim(),
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

  // Count how many option columns are active (for grid template)
  const optCols = (option1Values.length > 0 ? 1 : 0) + (option2Values.length > 0 ? 1 : 0) + (option3Values.length > 0 ? 1 : 0);
  const gridCols = `44px ${optCols > 0 ? `repeat(${optCols}, 1fr)` : '1fr'} 90px 60px`;

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
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
              placeholder="Product description..."
            />
          </div>
          <div className="space-y-2 text-sm pt-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles[product.status] || statusStyles.draft}`}>
                {product.status}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Design</span>
              <div className="flex items-center gap-2">
                {designArtworkUrls.length > 0 && (
                  <div className="flex gap-1.5">
                    {designArtworkUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxUrl(url)}
                        className="w-9 h-9 rounded-md bg-surface-secondary overflow-hidden border border-border hover:border-primary-400 hover:shadow-sm transition-all"
                      >
                        <img src={url} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
                {designTitle && (
                  <Link href={`/dashboard/designs/${product.design_id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                    {designTitle}
                  </Link>
                )}
              </div>
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
        {/* Pricing */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Pricing</h3>

          <div className="flex items-start gap-6">
            {/* Product Price */}
            <div className="flex-1">
              <label htmlFor="retail-price" className="block text-xs font-medium text-gray-500 mb-1.5">
                Product Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <input
                  id="retail-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={retailPrice}
                  onChange={(e) => { setRetailPrice(e.target.value); setSaved(false); }}
                  className="w-full rounded-xl border border-border pl-8 pr-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Default price for all variants</p>
            </div>

            {/* Profit summary */}
            <div className={`rounded-xl px-4 py-3 text-sm ${profit > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 text-xs">Profit</span>
                <span className={`text-lg font-bold ${profit > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ${profit.toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-gray-500 text-xs">Margin</span>
                <span className={`text-xs font-semibold ${profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Cost: ${COST.toFixed(2)}</p>
            </div>
          </div>

          {hasCustomPrices && (
            <button onClick={applyPriceToAll} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
              Reset all variants to product price
            </button>
          )}
        </div>

        {/* Color variant previews */}
        {colorVariants.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Colors</h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {colorVariants.map((v) => (
                <button
                  key={v.color}
                  onClick={() => setLightboxUrl(v.imageUrl)}
                  className="shrink-0 text-center group"
                >
                  <div className="w-20 h-20 rounded-lg border border-border bg-gray-50 overflow-hidden transition-all group-hover:border-primary-400 group-hover:shadow-sm">
                    <img src={v.imageUrl} alt={v.color} className="w-full h-full object-contain p-1" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block truncate w-20">{v.color}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variants with per-variant pricing */}
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

          {loadingSkus ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 ml-3">Loading variants...</span>
            </div>
          ) : skuError ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-700">{skuError}</p>
            </div>
          ) : erpSkus.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No variants found.</p>
          ) : (
            <>
              {/* Table header */}
              <div className="grid gap-2 px-2 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100"
                style={{ gridTemplateColumns: gridCols }}>
                <span></span>
                {option1Values.length > 0 && <span>{optionNames[0] || 'Option 1'}</span>}
                {option2Values.length > 0 && <span>{optionNames[1] || 'Option 2'}</span>}
                {option3Values.length > 0 && <span>{optionNames[2] || 'Option 3'}</span>}
                {!hasOptions && <span>SKU</span>}
                <span>Price</span>
                <span className="text-right">Stock</span>
              </div>

              {/* SKU rows */}
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {erpSkus.map((sku) => {
                  const enabled = enabledSkuIds.has(sku.id);
                  const varPrice = variantPrices[sku.id];
                  const effectivePrice = getVariantPrice(sku.id);
                  const isCustom = varPrice !== undefined && varPrice !== '';

                  return (
                    <div
                      key={sku.id}
                      className={`grid gap-2 items-center px-2 py-2.5 transition-all rounded-lg ${
                        enabled ? 'bg-white' : 'bg-gray-50 opacity-50'
                      }`}
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      {/* Checkbox */}
                      <button onClick={() => toggleSku(sku.id)} className="flex justify-center">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          enabled ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                        }`}>
                          {enabled && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Options */}
                      {option1Values.length > 0 && (
                        <span className="text-sm font-semibold text-gray-900 truncate">{sku.option1 || '—'}</span>
                      )}
                      {option2Values.length > 0 && (
                        <span className="text-sm text-gray-700 truncate">{sku.option2 || '—'}</span>
                      )}
                      {option3Values.length > 0 && (
                        <span className="text-sm text-gray-700 truncate">{sku.option3 || '—'}</span>
                      )}
                      {!hasOptions && (
                        <span className="text-sm font-mono text-gray-600 truncate">{sku.sku}</span>
                      )}

                      {/* Per-variant price */}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={isCustom ? varPrice : ''}
                          placeholder={priceNum.toFixed(2)}
                          onChange={(e) => setVariantPrice(sku.id, e.target.value)}
                          className={`w-full rounded-md border pl-5 pr-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                            isCustom ? 'border-primary-300 bg-primary-50/50' : 'border-border bg-white'
                          }`}
                        />
                      </div>

                      {/* Stock */}
                      <span className={`text-xs text-right font-medium ${
                        sku.inQty > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {sku.inQty > 0 ? sku.inQty : 'Out'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                {enabledSkuIds.size} of {erpSkus.length} variants selected
                {hasCustomPrices && (
                  <span className="ml-2 text-primary-500">
                    · {Object.values(variantPrices).filter(v => v !== '').length} custom price{Object.values(variantPrices).filter(v => v !== '').length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </>
          )}
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
            className="flex-1 rounded-xl border-2 border-primary-600 px-6 py-3 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
          </button>
          <button
            onClick={() => {
              alert('Store sync coming soon! Connect your store first in Settings.');
            }}
            className="flex-1 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-500 transition-all shadow-md shadow-primary-600/25"
          >
            Sync to Your Stores
          </button>
        </div>
      </div>

      {/* Lightbox for design artwork */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-square bg-gray-50 flex items-center justify-center">
                <img src={lightboxUrl} alt="Design artwork" className="max-w-full max-h-full object-contain p-4" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
