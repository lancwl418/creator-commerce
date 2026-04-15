'use client';

import { useEffect, useRef } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useMultiProductStore } from '@/stores/multiProductStore';
import { useDesignStore } from '@/stores/designStore';
import { useEditorConfig } from '@/components/editor/EditorConfigContext';
import { templateRegistry } from '@/core/templates/ProductTemplateRegistry';
import { validateTemplate, validateTemplates } from '@/core/templates/TemplateValidator';
import { convertShopifyProducts } from '@/core/templates/converters/shopifyProductConverter';
import { convertErpProducts } from '@/core/templates/converters/erpProductConverter';
import type { ProductTemplate } from '@/types/product';
import type { ShopifyProduct } from '@/types/shopify-product';
import type { ErpProductListResponse } from '@/types/erp-product';
import type { EditorConfig } from '@/types/editor-config';

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

      case 'portal': {
        // Portal mode: load all products, then match Portal-selected ones
        setLoading();
        setTemplates(templateRegistry.getAll());
        handlePortalMode(config, appendTemplates);
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
 * Portal mode handler:
 * 1. Fetch all Shopify & ERP products
 * 2. Match the Portal-selected template IDs
 * 3. Add matched products to multi-product store
 * 4. Auto-add artwork layer to the first product
 */
async function handlePortalMode(
  config: EditorConfig,
  appendTemplates: (templates: ProductTemplate[]) => void
) {
  const portalIds = config.portalTemplateIds ?? [];
  const artworkUrl = config.artworkUrl;

  // Fetch all external products
  await fetchExternalProducts(appendTemplates);

  // Now find the matching templates from the store
  const allTemplates = useProductStore.getState().templates;
  const matched: ProductTemplate[] = [];

  for (const id of portalIds) {
    // Try exact match first
    let found = allTemplates.find((t) => t.id === id);

    // Try matching by Shopify product ID in metadata
    if (!found && id.startsWith('shopify-')) {
      const shopifyId = id.replace('shopify-', '');
      found = allTemplates.find(
        (t) => t.metadata?.shopifyProductId?.toString() === shopifyId
      );
    }

    // Try matching by ERP product ID in metadata
    if (!found && id.startsWith('erp-')) {
      const erpId = id.replace('erp-', '');
      found = allTemplates.find(
        (t) => t.metadata?.erpProductId?.toString() === erpId ||
               t.metadata?.itemNo === erpId
      );
    }

    if (found) matched.push(found);
  }

  if (matched.length === 0) {
    console.warn('[TemplateLoader] No matching templates found for Portal IDs:', portalIds);
    // Fall through — editor will show all products for manual selection
    return;
  }

  // Add matched products to multi-product store
  const multiStore = useMultiProductStore.getState();
  for (const template of matched) {
    multiStore.addProduct(template);
  }

  // Select the first matched template in the editor
  const { selectTemplate } = useProductStore.getState();
  selectTemplate(matched[0].id);

  // Initialize design for the first template
  const { initDesign } = useDesignStore.getState();
  initDesign(matched[0].id, matched[0].views.map((v) => v.id));

  // Auto-add artwork as a layer to ALL products if provided
  if (artworkUrl) {
    multiStore.setArtworkUrl(artworkUrl);

    // Wait for the canvas to initialize, then add artwork to active product
    setTimeout(() => {
      addArtworkLayer(artworkUrl);

      // After artwork is added to the first product, save it and apply to all
      // Need another delay to let the image load and layer be added
      setTimeout(() => {
        const currentDesign = structuredClone(useDesignStore.getState().design);
        multiStore.saveCurrentProduct(currentDesign);
        multiStore.applyToAll(0);
      }, 1000);
    }, 1500);
  }
}

/**
 * Adds the designer's artwork as an image layer on the current canvas.
 */
function addArtworkLayer(artworkUrl: string) {
  const { design, addLayer } = useDesignStore.getState();
  const { activeViewId } = useProductStore.getState();

  if (!activeViewId || !design.views[activeViewId]) return;

  // Proxy external URLs to avoid CORS canvas tainting
  const proxiedUrl = artworkUrl.startsWith('/') || artworkUrl.startsWith('data:')
    ? artworkUrl
    : `/api/image-proxy?url=${encodeURIComponent(artworkUrl)}`;

  // Load image to get dimensions
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const layer = {
      id: `artwork-${Date.now()}`,
      type: 'image' as const,
      name: 'Artwork',
      visible: true,
      locked: false,
      opacity: 1,
      transform: {
        x: 50,
        y: 50,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rotation: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        flipX: false,
        flipY: false,
      },
      data: {
        type: 'image' as const,
        src: proxiedUrl,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        filters: [],
      },
    };

    addLayer(activeViewId, layer);

    // Dispatch event so canvas picks up the new layer
    window.dispatchEvent(
      new CustomEvent('ideamizer:layer-added', { detail: layer })
    );
  };
  img.onerror = () => {
    console.warn('[TemplateLoader] Failed to load artwork image:', artworkUrl);
  };
  img.src = proxiedUrl;
}

/**
 * Fetches Shopify and ERP products in parallel, converts them to
 * ProductTemplates, and appends them to the store.
 * Failures are non-fatal — the editor continues with demo templates.
 */
async function fetchExternalProducts(
  appendTemplates: (templates: ProductTemplate[]) => void
) {
  const [shopifyResult, erpResult] = await Promise.allSettled([
    fetch('/api/shopify-products?limit=20').then((res) => {
      if (!res.ok) throw new Error(`Shopify API ${res.status}`);
      return res.json() as Promise<{ products: ShopifyProduct[] }>;
    }),
    fetch('/api/erp-products?pageNo=1&pageSize=200').then((res) => {
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
