'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cacheErpProducts } from '@/lib/api/erp-products';
import { buildCachedEditorUrl } from '@/lib/design-engine';
import type { ErpProduct } from '@/lib/types/catalog';

export function useCatalogDesign() {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function launch(products: ErpProduct[], single: boolean) {
    if (!products.length || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const key = await cacheErpProducts(products);
      const templates = products.map(product => `erp-${product.id}`).join(',');
      if (single) {
        router.push(`/dashboard/products/create?${new URLSearchParams({ templates, cache_key: key })}`);
      } else {
        window.location.assign(buildCachedEditorUrl(templates, key, window.location.origin, false));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open editor');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { busy, error, startDesign: (product: ErpProduct) => launch([product], true), startSelected: (products: ErpProduct[]) => launch(products, false) };
}
