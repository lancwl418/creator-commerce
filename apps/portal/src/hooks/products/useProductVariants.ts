'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ErpSku, ProductData } from '@/lib/types';
import { fetchProductVariants } from '@/lib/api/product-variants';
import {
  resolveErpImageUrl, extractColorVariants, extractOptionValues, groupSkusByColor,
  isColorFullyEnabled, isColorPartiallyEnabled,
} from '@/lib/utils';

export function useProductVariants(product: ProductData, onChange: () => void) {
  const [erpSkus, setErpSkus] = useState<ErpSku[]>([]);
  const [optionNames, setOptionNames] = useState<string[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  const [skuError, setSkuError] = useState('');
  const [enabledSkuIds, setEnabledSkuIds] = useState<Set<string>>(() =>
    new Set(product.selected_skus.filter((sku) => sku.enabled).map((sku) => sku.sku_id))
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProductVariants(product.product_template_id, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setErpSkus(data.skus);
        setOptionNames(data.option_names);
        if (product.selected_skus.length === 0 && data.skus.length > 0) {
          setEnabledSkuIds(new Set(data.skus.map((sku) => sku.id)));
        }
        setSkuError('');
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSkuError(error instanceof Error ? error.message : 'Failed to load variants');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSkus(false);
      });
    return () => controller.abort();
  }, [product.product_template_id, product.selected_skus]);

  const { option1: option1Values, option2: option2Values, option3: option3Values } = useMemo(
    () => extractOptionValues(erpSkus), [erpSkus]
  );
  const colorVariants = useMemo(
    () => extractColorVariants(erpSkus, product.variant_preview_urls, resolveErpImageUrl),
    [erpSkus, product.variant_preview_urls]
  );
  const skusByColor = useMemo(() => groupSkusByColor(erpSkus, option1Values), [erpSkus, option1Values]);

  const toggleSku = useCallback((skuId: string) => {
    setEnabledSkuIds((prev) => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId); else next.add(skuId);
      return next;
    });
    onChange();
  }, [onChange]);

  const toggleColor = useCallback((color: string) => {
    const skus = erpSkus.filter((sku) => sku.option1 === color);
    setEnabledSkuIds((prev) => {
      const allEnabled = skus.every((sku) => prev.has(sku.id));
      const next = new Set(prev);
      for (const sku of skus) {
        if (allEnabled) next.delete(sku.id); else next.add(sku.id);
      }
      return next;
    });
    onChange();
  }, [erpSkus, onChange]);

  return {
    erpSkus, optionNames, loadingSkus, skuError, enabledSkuIds,
    option1Values, option2Values, option3Values, colorVariants, skusByColor,
    hasOptions: option1Values.length > 0 || option2Values.length > 0,
    toggleSku, toggleColor,
    selectAll: () => { setEnabledSkuIds(new Set(erpSkus.map((sku) => sku.id))); onChange(); },
    clearAll: () => { setEnabledSkuIds(new Set()); onChange(); },
    isColorFull: (color: string) => isColorFullyEnabled(erpSkus, color, enabledSkuIds),
    isColorPartial: (color: string) => isColorPartiallyEnabled(erpSkus, color, enabledSkuIds),
  };
}
