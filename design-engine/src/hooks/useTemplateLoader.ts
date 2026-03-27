'use client';

import { useEffect, useRef } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useEditorConfig } from '@/components/editor/EditorConfigContext';
import { templateRegistry } from '@/core/templates/ProductTemplateRegistry';
import { validateTemplate, validateTemplates } from '@/core/templates/TemplateValidator';
import { convertShopifyProducts } from '@/core/templates/converters/shopifyProductConverter';
import { convertErpProducts } from '@/core/templates/converters/erpProductConverter';
import type { ShopifyProduct } from '@/types/shopify-product';
import type { ErpProductListResponse } from '@/types/erp-product';

/**
 * Loads templates into productStore based on EditorConfig mode.
 * Call once at the top of the editor component tree.
 */
export function useTemplateLoader() {
  const config = useEditorConfig();
  const status = useProductStore((s) => s.status);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const { setTemplates, appendTemplates, setEmbeddedTemplate, setLoading, setError } =
      useProductStore.getState();

    switch (config.mode) {
      case 'demo': {
        setTemplates(templateRegistry.getAll());
        fetchExternalProducts(appendTemplates);
        break;
      }

      case 'embedded': {
        if (!config.template) {
          setError('Embedded mode requires a template in EditorConfig');
          return;
        }
        const validated = validateTemplate(config.template);
        if (!validated) {
          setError('Invalid template provided to embedded editor');
          return;
        }
        setEmbeddedTemplate(validated);
        break;
      }

      case 'standalone': {
        if (!config.apiEndpoint) {
          setError('Standalone mode requires an apiEndpoint in EditorConfig');
          return;
        }
        setLoading();

        fetch(config.apiEndpoint, {
          headers: config.apiHeaders ?? {},
        })
          .then((res) => {
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            return res.json();
          })
          .then((data: unknown) => {
            const templates = validateTemplates(
              Array.isArray(data) ? data : []
            );
            if (templates.length === 0) {
              setError('No valid templates returned from API');
              return;
            }
            setTemplates(templates);
          })
          .catch((err: Error) => {
            setError(err.message);
          });
        break;
      }
    }
  }, [config]);

  return status;
}

/**
 * Fetches Shopify and ERP products in parallel, converts them to
 * ProductTemplates, and appends them to the store.
 * Failures are non-fatal — the editor continues with demo templates.
 */
async function fetchExternalProducts(
  appendTemplates: (templates: import('@/types/product').ProductTemplate[]) => void
) {
  const [shopifyResult, erpResult] = await Promise.allSettled([
    fetch('/api/shopify-products?limit=20').then((res) => {
      if (!res.ok) throw new Error(`Shopify API ${res.status}`);
      return res.json() as Promise<{ products: ShopifyProduct[] }>;
    }),
    fetch('/api/erp-products?pageNo=1&pageSize=20').then((res) => {
      if (!res.ok) throw new Error(`ERP API ${res.status}`);
      return res.json() as Promise<ErpProductListResponse>;
    }),
  ]);

  if (shopifyResult.status === 'fulfilled' && shopifyResult.value.products) {
    const templates = convertShopifyProducts(shopifyResult.value.products);
    if (templates.length > 0) appendTemplates(templates);
  } else if (shopifyResult.status === 'rejected') {
    console.warn('[TemplateLoader] Failed to load Shopify products:', shopifyResult.reason);
  }

  if (erpResult.status === 'fulfilled' && erpResult.value.success) {
    const templates = convertErpProducts(erpResult.value.result.records);
    if (templates.length > 0) appendTemplates(templates);
  } else if (erpResult.status === 'rejected') {
    console.warn('[TemplateLoader] Failed to load ERP products:', erpResult.reason);
  }
}
