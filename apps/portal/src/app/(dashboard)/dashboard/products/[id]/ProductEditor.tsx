'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SyncModal from './SyncModal';
import type { ErpSku, SkuSelection, Listing, ProductData } from '@/lib/types';
import { DEFAULT_COST, PRODUCT_STATUS_COLORS } from '@/lib/constants';

function erpImg(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Convert design-engine proxy URLs (/api/erp-image) to portal format (/api/erp/image)
  if (path.startsWith('/api/erp-image?')) {
    return path.replace('/api/erp-image?', '/api/erp/image?');
  }
  if (path.startsWith('/api/')) return path;
  return `/api/erp/image?path=${encodeURIComponent(path)}`;
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
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Selected ERP product images to sync to store
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(() => {
    return new Set(product.product_images.map(img => img.id));
  });

  const toggleProductImage = useCallback((imgId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId); else next.add(imgId);
      return next;
    });
    setSaved(false);
  }, []);

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
  // Use R2 design previews if available, fallback to ERP SKU images
  const colorVariants = useMemo(() => {
    const seen = new Set<string>();
    const variants: { color: string; imageUrl: string }[] = [];
    const variantPreviews = product.variant_preview_urls || {};
    for (const sku of erpSkus) {
      const color = sku.option1 || sku.option2;
      if (!color || seen.has(color)) continue;
      seen.add(color);
      // Prefer R2 design preview (has design composited), fallback to raw SKU image
      const previewFromR2 = variantPreviews[color];
      const fallbackImage = sku.skuImage ? erpImg(sku.skuImage) : '';
      if (previewFromR2 || fallbackImage) {
        variants.push({ color, imageUrl: previewFromR2 || fallbackImage });
      }
    }
    return variants;
  }, [erpSkus, product.variant_preview_urls]);

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

  // Toggle all variants for a given color (option1 value)
  const toggleColor = useCallback((colorValue: string) => {
    const skusForColor = erpSkus.filter(s => s.option1 === colorValue);
    const allEnabled = skusForColor.every(s => enabledSkuIds.has(s.id));
    setEnabledSkuIds(prev => {
      const next = new Set(prev);
      for (const s of skusForColor) {
        if (allEnabled) next.delete(s.id); else next.add(s.id);
      }
      return next;
    });
    setSaved(false);
  }, [erpSkus, enabledSkuIds]);

  // Check if all variants for a color are enabled
  const isColorFullyEnabled = useCallback((colorValue: string) => {
    return erpSkus.filter(s => s.option1 === colorValue).every(s => enabledSkuIds.has(s.id));
  }, [erpSkus, enabledSkuIds]);

  // Check if some (but not all) variants for a color are enabled
  const isColorPartiallyEnabled = useCallback((colorValue: string) => {
    const skusForColor = erpSkus.filter(s => s.option1 === colorValue);
    const enabledCount = skusForColor.filter(s => enabledSkuIds.has(s.id)).length;
    return enabledCount > 0 && enabledCount < skusForColor.length;
  }, [erpSkus, enabledSkuIds]);

  // Group SKUs by option1 (Color) for grouped display
  const skusByColor = useMemo(() => {
    if (option1Values.length === 0) return null;
    const groups: { color: string; skus: ErpSku[] }[] = [];
    for (const color of option1Values) {
      groups.push({ color, skus: erpSkus.filter(s => s.option1 === color) });
    }
    // Also include SKUs with no option1
    const noColor = erpSkus.filter(s => !s.option1);
    if (noColor.length > 0) groups.push({ color: '', skus: noColor });
    return groups;
  }, [erpSkus, option1Values]);

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

  // Build cost lookup from ERP SKU prices
  const skuCostMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const sku of erpSkus) {
      map.set(sku.id, sku.price || DEFAULT_COST);
    }
    return map;
  }, [erpSkus]);

  // Get cost for a specific variant
  const getSkuCost = useCallback((skuId: string): number => {
    return skuCostMap.get(skuId) ?? DEFAULT_COST;
  }, [skuCostMap]);

  const priceNum = parseFloat(retailPrice) || 0;
  const hasCustomPrices = Object.keys(variantPrices).some(k => variantPrices[k] !== '');

  // Calculate profit range across all enabled variants
  const profitRange = useMemo(() => {
    const enabledSkus = erpSkus.filter(s => enabledSkuIds.has(s.id));
    if (enabledSkus.length === 0) return { min: 0, max: 0, minMargin: 0, maxMargin: 0, costMin: 0, costMax: 0, uniform: true };

    let minProfit = Infinity;
    let maxProfit = -Infinity;
    let costMin = Infinity;
    let costMax = -Infinity;

    for (const sku of enabledSkus) {
      const cost = sku.price || DEFAULT_COST;
      const salePrice = variantPrices[sku.id] !== undefined && variantPrices[sku.id] !== ''
        ? parseFloat(variantPrices[sku.id]) || 0
        : priceNum;
      const profit = salePrice - cost;
      if (profit < minProfit) minProfit = profit;
      if (profit > maxProfit) maxProfit = profit;
      if (cost < costMin) costMin = cost;
      if (cost > costMax) costMax = cost;
    }

    const minMargin = priceNum > 0 ? (minProfit / priceNum) * 100 : 0;
    const maxMargin = priceNum > 0 ? (maxProfit / priceNum) * 100 : 0;
    const uniform = Math.abs(minProfit - maxProfit) < 0.01;

    return { min: minProfit, max: maxProfit, minMargin, maxMargin, costMin, costMax, uniform };
  }, [erpSkus, enabledSkuIds, variantPrices, priceNum]);

  // Core save logic — returns true on success, throws on failure
  const saveProduct = useCallback(async () => {
    if (priceNum <= 0) throw new Error('Please enter a valid price');
    if (enabledSkuIds.size === 0) throw new Error('Please select at least one variant');

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
        erpPrice: sku.price || null,
        skuImage: sku.skuImage || null,
      };
    });

    const { error: updateError } = await supabase
      .from('sellable_product_instances')
      .update({
        title: title.trim() || product.title,
        description: description.trim(),
        selected_skus: skuSelections,
        option_names: optionNames,
        retail_price: priceNum,
        cost: profitRange.costMin,
        product_images: product.product_images.filter(img => selectedImageIds.has(img.id)),
        status: product.status === 'draft' ? 'ready' : product.status,
      })
      .eq('id', product.id);

    if (updateError) throw updateError;
  }, [erpSkus, enabledSkuIds, variantPrices, priceNum, title, description, optionNames, product, supabase]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await saveProduct();
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const statusStyles = PRODUCT_STATUS_COLORS;

  // Count how many option columns are active (for grid template)
  const optCols = (option1Values.length > 0 ? 1 : 0) + (option2Values.length > 0 ? 1 : 0) + (option3Values.length > 0 ? 1 : 0);
  const gridCols = `44px ${optCols > 0 ? `repeat(${optCols}, 1fr)` : '1fr'} 70px 90px 70px 60px`;

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
                      {listing.creator_store_connections?.store_name || listing.channel_type}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400 capitalize">{listing.creator_store_connections?.platform || 'store'}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                        {listing.status}
                      </span>
                    </div>
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
            <div className={`rounded-xl px-4 py-3 text-sm ${profitRange.min > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 text-xs">Profit</span>
                <span className={`text-lg font-bold ${profitRange.min > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {profitRange.uniform
                    ? `$${profitRange.min.toFixed(2)}`
                    : `$${profitRange.min.toFixed(2)} – $${profitRange.max.toFixed(2)}`
                  }
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-gray-500 text-xs">Margin</span>
                <span className={`text-xs font-semibold ${profitRange.min > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {profitRange.uniform
                    ? `${profitRange.minMargin.toFixed(1)}%`
                    : `${profitRange.minMargin.toFixed(1)}% – ${profitRange.maxMargin.toFixed(1)}%`
                  }
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Cost: {profitRange.costMin === profitRange.costMax
                  ? `$${profitRange.costMin.toFixed(2)}`
                  : `$${profitRange.costMin.toFixed(2)} – $${profitRange.costMax.toFixed(2)}`
                }
              </p>
            </div>
          </div>

          {hasCustomPrices && (
            <button onClick={applyPriceToAll} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
              Reset all variants to product price
            </button>
          )}
        </div>

        {/* Color variant previews with design composited */}
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

        {/* Product Images (from ERP) — select which to sync */}
        {product.product_images.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product Images</h3>
              <span className="text-xs text-gray-400">{selectedImageIds.size}/{product.product_images.length} selected for sync</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {product.product_images.map((img) => {
                const selected = selectedImageIds.has(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => toggleProductImage(img.id)}
                    className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                      selected ? 'border-primary-500 shadow-sm' : 'border-transparent opacity-50'
                    }`}
                  >
                    <div className="aspect-square bg-gray-50">
                      <img src={erpImg(img.url)} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className={`absolute top-1 right-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selected ? 'bg-primary-600 border-primary-600' : 'bg-white/80 border-gray-300'
                    }`}>
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    {img.isMain && (
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 rounded">MAIN</span>
                    )}
                  </button>
                );
              })}
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
                {option1Values.length > 0 && <span>{optionNames[0] || 'Color'}</span>}
                {option2Values.length > 0 && <span>{optionNames[1] || 'Size'}</span>}
                {option3Values.length > 0 && <span>{optionNames[2] || 'Option 3'}</span>}
                {!hasOptions && <span>SKU</span>}
                <span>Cost</span>
                <span>Price</span>
                <span>Profit</span>
                <span className="text-right">Stock</span>
              </div>

              {/* SKU rows — grouped by color (option1) when available */}
              <div className="max-h-[400px] overflow-y-auto">
                {skusByColor ? (
                  skusByColor.map((group) => {
                    const colorLabel = group.color || 'Other';
                    const allEnabled = isColorFullyEnabled(group.color);
                    const partial = isColorPartiallyEnabled(group.color);
                    const enabledCount = group.skus.filter(s => enabledSkuIds.has(s.id)).length;

                    return (
                      <div key={group.color} className="mb-1">
                        {/* Color group header */}
                        <button
                          onClick={() => toggleColor(group.color)}
                          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all hover:bg-gray-50 ${
                            !allEnabled && !partial ? 'opacity-60' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                            allEnabled ? 'bg-primary-600 border-primary-600' : partial ? 'border-primary-400 bg-primary-100' : 'border-gray-300'
                          }`}>
                            {allEnabled && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                            {partial && (
                              <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{colorLabel}</span>
                          <span className="text-[11px] text-gray-400 ml-auto">
                            {enabledCount}/{group.skus.length}
                          </span>
                        </button>

                        {/* Individual SKU rows under this color */}
                        <div className="divide-y divide-gray-50 ml-4 border-l border-gray-100 pl-2">
                          {group.skus.map((sku) => {
                            const enabled = enabledSkuIds.has(sku.id);
                            const varPrice = variantPrices[sku.id];
                            const isCustom = varPrice !== undefined && varPrice !== '';

                            // For grouped view, skip option1 column since it's shown in the header
                            const innerGridCols = `44px ${
                              (option2Values.length > 0 ? '1fr ' : '') +
                              (option3Values.length > 0 ? '1fr ' : '')
                            }70px 90px 70px 60px`.trim();

                            const skuCost = getSkuCost(sku.id);
                            const effectiveSalePrice = isCustom ? (parseFloat(varPrice) || 0) : priceNum;
                            const skuProfit = effectiveSalePrice - skuCost;

                            return (
                              <div
                                key={sku.id}
                                className={`grid gap-2 items-center px-2 py-2 transition-all rounded-lg ${
                                  enabled ? 'bg-white' : 'bg-gray-50 opacity-50'
                                }`}
                                style={{ gridTemplateColumns: innerGridCols }}
                              >
                                <button onClick={() => toggleSku(sku.id)} className="flex justify-center">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                    enabled ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                                  }`}>
                                    {enabled && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                                {option2Values.length > 0 && (
                                  <span className="text-sm text-gray-700 truncate">{sku.option2 || '—'}</span>
                                )}
                                {option3Values.length > 0 && (
                                  <span className="text-sm text-gray-700 truncate">{sku.option3 || '—'}</span>
                                )}
                                <span className="text-xs text-gray-500">${skuCost.toFixed(2)}</span>
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
                                <span className={`text-xs font-medium ${skuProfit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  ${skuProfit.toFixed(2)}
                                </span>
                                <span className={`text-xs text-right font-medium ${
                                  sku.inQty > 0 ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                  {sku.inQty > 0 ? sku.inQty : 'Out'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Flat list when no option1 grouping */
                  <div className="divide-y divide-gray-50">
                    {erpSkus.map((sku) => {
                      const enabled = enabledSkuIds.has(sku.id);
                      const varPrice = variantPrices[sku.id];
                      const isCustom = varPrice !== undefined && varPrice !== '';
                      const skuCost = getSkuCost(sku.id);
                      const effectiveSalePrice = isCustom ? (parseFloat(varPrice) || 0) : priceNum;
                      const skuProfit = effectiveSalePrice - skuCost;

                      return (
                        <div
                          key={sku.id}
                          className={`grid gap-2 items-center px-2 py-2.5 transition-all rounded-lg ${
                            enabled ? 'bg-white' : 'bg-gray-50 opacity-50'
                          }`}
                          style={{ gridTemplateColumns: gridCols }}
                        >
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
                          {option2Values.length > 0 && (
                            <span className="text-sm text-gray-700 truncate">{sku.option2 || '—'}</span>
                          )}
                          {option3Values.length > 0 && (
                            <span className="text-sm text-gray-700 truncate">{sku.option3 || '—'}</span>
                          )}
                          {!hasOptions && (
                            <span className="text-sm font-mono text-gray-600 truncate">{sku.sku}</span>
                          )}
                          <span className="text-xs text-gray-500">${skuCost.toFixed(2)}</span>
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
                          <span className={`text-xs font-medium ${skuProfit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            ${skuProfit.toFixed(2)}
                          </span>
                          <span className={`text-xs text-right font-medium ${
                            sku.inQty > 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {sku.inQty > 0 ? sku.inQty : 'Out'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
            onClick={() => setShowSyncModal(true)}
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

      {showSyncModal && (
        <SyncModal
          productId={product.id}
          listings={listings}
          onClose={() => setShowSyncModal(false)}
          onSynced={() => router.refresh()}
          onBeforeSync={saveProduct}
        />
      )}
    </div>
  );
}
