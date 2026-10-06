'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductData, WizardStep } from '@/lib/types/product';
import { calculateProfitRange, getSkuCost, markupPrice } from '@/lib/utils';
import { saveProductDraft } from '@/lib/products/mutations';
import { useProductVariants } from './useProductVariants';

export function useProductEditor(product: ProductData) {
  const router = useRouter();

  // ── State ──
  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [tags, setTags] = useState<string[]>(product.tags ?? []);
  const [step, setStep] = useState<WizardStep>('detail');
  const [markup, setMarkup] = useState('100');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(() =>
    new Set(product.product_images.map(img => img.id))
  );
  const [retailPrice, setRetailPrice] = useState(
    product.retail_price?.toString() ?? product.base_price_suggestion?.toString() ?? ''
  );
  const [shippingCost, setShippingCost] = useState(
    product.shipping_cost != null ? product.shipping_cost.toString() : '0'
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

  const markDirty = useCallback(() => setSaved(false), []);
  const variants = useProductVariants(product, markDirty);
  const { erpSkus, enabledSkuIds, optionNames, loadingSkus, skuError } = variants;

  const priceNum = parseFloat(retailPrice) || 0;
  const shippingNum = parseFloat(shippingCost) || 0;
  const hasCustomPrices = Object.keys(variantPrices).some(k => variantPrices[k] !== '');

  const profitRange = useMemo(
    () => calculateProfitRange(erpSkus, enabledSkuIds, variantPrices, priceNum, shippingNum),
    [erpSkus, enabledSkuIds, variantPrices, priceNum, shippingNum]
  );

  // ── Callbacks ──
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
        if (cost == null) continue;
        next[sku.id] = markupPrice(cost, pct).toFixed(2);
      }
      return next;
    });
    setSaved(false);
  }, [markup, erpSkus, enabledSkuIds]);

  const saveProduct = useCallback(async () => {
    if (loadingSkus || skuError) throw new Error('Please wait until variants have loaded successfully');
    await saveProductDraft(product, {
      erpSkus, enabledSkuIds, variantPrices, optionNames, title, description, tags,
      selectedImageIds, retailPrice: priceNum, shippingCost: shippingNum, costMin: profitRange?.costMin ?? null,
    });
  }, [product, erpSkus, enabledSkuIds, variantPrices, optionNames, title, description, tags,
    selectedImageIds, priceNum, shippingNum, profitRange?.costMin, loadingSkus, skuError]);

  // Remember which wizard step the user was on for this product, so reopening
  // it (e.g. after Save as Draft sends them to the list) returns to that step.
  // Restore once on mount; persist only on explicit navigation via goToStep so
  // the initial 'detail' render never clobbers a saved 'price'.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pe_step_${product.id}`);
      if (saved === 'price' || saved === 'detail') setStep(saved);
    } catch { }
  }, [product.id]);

  const goToStep = useCallback((s: WizardStep) => {
    setStep(s);
    try {
      localStorage.setItem(`pe_step_${product.id}`, s);
    } catch { }
  }, [product.id]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await saveProduct();
      setSaved(true);
      // Saving a draft moves it into the Unpublished tab — land the user there.
      router.push('/dashboard/products?tab=unpublished');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return {
    ...variants,
    title,
    setTitle: (value: string) => { setTitle(value); markDirty(); },
    description,
    setDescription: (value: string) => { setDescription(value); markDirty(); },
    tags,
    setTags: (value: string[]) => { setTags(value); markDirty(); },
    step, goToStep, markup, setMarkup, selectedImageIds,
    retailPrice,
    setRetailPrice: (value: string) => { setRetailPrice(value); markDirty(); },
    shippingCost,
    setShippingCost: (value: string) => { setShippingCost(value); markDirty(); },
    variantPrices,
    saving, saved, error, priceNum, hasCustomPrices, profitRange,
    toggleProductImage, setVariantPrice, applyPriceToAll, applyMarkup, saveProduct, handleSave,
  };
}
