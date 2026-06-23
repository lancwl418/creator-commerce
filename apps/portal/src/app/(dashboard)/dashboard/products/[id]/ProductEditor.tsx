'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ErpSku, SkuSelection, Listing, ProductData } from '@/lib/types';
import {
  resolveErpImageUrl, extractColorVariants, extractOptionValues,
  groupSkusByColor, isColorFullyEnabled as checkColorEnabled,
  isColorPartiallyEnabled as checkColorPartial,
  calculateProfitRange, getSkuCost, markupPrice,
} from '@/lib/utils';

import SyncModal from './SyncModal';
import UnlistModal from './UnlistModal';
import WizardSteps, { type WizardStep } from './components/WizardSteps';
import PricingPanel from './components/PricingPanel';
import ColorPreviews from './components/ColorPreviews';
import ProductImagesSelector from './components/ProductImagesSelector';
import VariantsTable from './components/VariantsTable';
import ChannelListings from './components/ChannelListings';
import ProductInfoCard from './components/ProductInfoCard';
import Lightbox from './components/Lightbox';

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

  // ── State ──
  const [erpSkus, setErpSkus] = useState<ErpSku[]>([]);
  const [optionNames, setOptionNames] = useState<string[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  const [skuError, setSkuError] = useState('');
  const [enabledSkuIds, setEnabledSkuIds] = useState<Set<string>>(() =>
    new Set(product.selected_skus.filter(s => s.enabled).map(s => s.sku_id))
  );
  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showUnlistModal, setShowUnlistModal] = useState(false);
  const [step, setStep] = useState<WizardStep>('detail');
  const [markup, setMarkup] = useState('100');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(() =>
    new Set(product.product_images.map(img => img.id))
  );
  const [retailPrice, setRetailPrice] = useState(
    product.retail_price?.toString() || product.base_price_suggestion?.toString() || '25.00'
  );
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

  // ── Fetch SKUs ──
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

  // ── Derived values ──
  const { option1: option1Values, option2: option2Values, option3: option3Values } = useMemo(
    () => extractOptionValues(erpSkus), [erpSkus]
  );
  const hasOptions = option1Values.length > 0 || option2Values.length > 0;

  const colorVariants = useMemo(
    () => extractColorVariants(erpSkus, product.variant_preview_urls, resolveErpImageUrl),
    [erpSkus, product.variant_preview_urls]
  );

  const skusByColor = useMemo(
    () => groupSkusByColor(erpSkus, option1Values),
    [erpSkus, option1Values]
  );

  const priceNum = parseFloat(retailPrice) || 0;
  const hasCustomPrices = Object.keys(variantPrices).some(k => variantPrices[k] !== '');

  const profitRange = useMemo(
    () => calculateProfitRange(erpSkus, enabledSkuIds, variantPrices, priceNum),
    [erpSkus, enabledSkuIds, variantPrices, priceNum]
  );

  // ── Callbacks ──
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

  const toggleProductImage = useCallback((imgId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId); else next.add(imgId);
      return next;
    });
    setSaved(false);
  }, []);

  const setVariantPrice = useCallback((skuId: string, value: string) => {
    setVariantPrices(prev => ({ ...prev, [skuId]: value }));
    setSaved(false);
  }, []);

  const applyPriceToAll = useCallback(() => { setVariantPrices({}); setSaved(false); }, []);

  // Bulk-set every enabled variant's price to cost × (1 + markup%)
  const applyMarkup = useCallback(() => {
    const pct = parseFloat(markup);
    if (isNaN(pct)) return;
    setVariantPrices(() => {
      const next: Record<string, string> = {};
      for (const sku of erpSkus) {
        if (!enabledSkuIds.has(sku.id)) continue;
        const cost = getSkuCost(sku);
        next[sku.id] = markupPrice(cost, pct).toFixed(2);
      }
      return next;
    });
    setSaved(false);
  }, [markup, erpSkus, enabledSkuIds]);

  const isColorFull = useCallback((c: string) => checkColorEnabled(erpSkus, c, enabledSkuIds), [erpSkus, enabledSkuIds]);
  const isColorPartial = useCallback((c: string) => checkColorPartial(erpSkus, c, enabledSkuIds), [erpSkus, enabledSkuIds]);

  // ── Save ──
  const saveProduct = useCallback(async () => {
    if (priceNum <= 0) throw new Error('Please enter a valid price');
    if (enabledSkuIds.size === 0) throw new Error('Please select at least one variant');

    const skuSelections: SkuSelection[] = erpSkus.map(sku => ({
      sku_id: sku.id,
      sku: sku.sku,
      option1: sku.option1,
      option2: sku.option2,
      option3: sku.option3,
      enabled: enabledSkuIds.has(sku.id),
      price: variantPrices[sku.id] !== undefined && variantPrices[sku.id] !== ''
        ? (parseFloat(variantPrices[sku.id]) || null) : null,
      erpPrice: sku.price || null,
      skuImage: sku.skuImage || null,
    }));

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
  }, [erpSkus, enabledSkuIds, variantPrices, priceNum, title, description, optionNames, product, supabase, selectedImageIds, profitRange.costMin]);

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

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Wizard top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        {step === 'detail' ? (
          <Link
            href="/dashboard/products"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
        ) : (
          <button
            onClick={() => setStep('detail')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to detail
          </button>
        )}

        <div className="hidden sm:block">
          <WizardSteps current={step} onStepClick={(s) => setStep(s === 'price' ? 'price' : 'detail')} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save as Draft'}
          </button>
          {step === 'detail' ? (
            <button
              onClick={() => setStep('price')}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Continue to Price
            </button>
          ) : (
            <button
              onClick={() => setShowSyncModal(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step content */}
      {step === 'detail' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column */}
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

            <ProductInfoCard
              title={title}
              description={description}
              status={product.status}
              designId={product.design_id}
              designTitle={designTitle}
              designArtworkUrls={designArtworkUrls}
              createdAt={product.created_at}
              onTitleChange={(v) => { setTitle(v); setSaved(false); }}
              onDescriptionChange={(v) => { setDescription(v); setSaved(false); }}
              onImageClick={setLightboxUrl}
            />

            <ChannelListings listings={listings} onUnlist={() => setShowUnlistModal(true)} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-5">
            <ColorPreviews colorVariants={colorVariants} onImageClick={setLightboxUrl} />

            <ProductImagesSelector
              images={product.product_images}
              selectedIds={selectedImageIds}
              onToggle={toggleProductImage}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-w-4xl">
          <PricingPanel
            retailPrice={retailPrice}
            onRetailPriceChange={(v) => { setRetailPrice(v); setSaved(false); }}
            profitRange={profitRange}
            hasCustomPrices={hasCustomPrices}
            onResetPrices={applyPriceToAll}
          />

          {/* Bulk markup */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Set markup</label>
              <div className="relative w-28">
                <input
                  type="number"
                  min="0"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className="w-full rounded-lg border border-border pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <button
              onClick={applyMarkup}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
            >
              Apply to all variants
            </button>
            <p className="text-[11px] text-gray-400 flex-1 min-w-[200px]">
              Sets every enabled variant&apos;s price to cost × (1 + markup%).
            </p>
          </div>

          <VariantsTable
            erpSkus={erpSkus}
            enabledSkuIds={enabledSkuIds}
            variantPrices={variantPrices}
            productPrice={priceNum}
            optionNames={optionNames}
            option1Values={option1Values}
            option2Values={option2Values}
            option3Values={option3Values}
            hasOptions={hasOptions}
            skusByColor={skusByColor}
            loadingSkus={loadingSkus}
            skuError={skuError}
            onToggleSku={toggleSku}
            onToggleColor={toggleColor}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            onSetVariantPrice={setVariantPrice}
            isColorFullyEnabled={isColorFull}
            isColorPartiallyEnabled={isColorPartial}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* Sync Modal */}
      {showSyncModal && (
        <SyncModal
          productId={product.id}
          listings={listings}
          onClose={() => setShowSyncModal(false)}
          onSynced={() => router.refresh()}
          onBeforeSync={saveProduct}
        />
      )}

      {/* Unlist Modal */}
      {showUnlistModal && (
        <UnlistModal
          productId={product.id}
          listings={listings}
          onClose={() => setShowUnlistModal(false)}
          onUnlisted={() => router.refresh()}
        />
      )}
    </div>
  );
}
