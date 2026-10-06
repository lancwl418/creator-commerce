'use client';

import { useEffect, useRef, useState } from 'react';
import { importDesignProducts } from '@/lib/products/mutations';
import { consumeDesignPayload } from '@/lib/products/importPayload';
import type { CreatedProductRow } from '@/lib/types/product-import';

/** One import per mounted flow, including React's development effect replay. */
export function useDesignImport(creatorId: string, storageKey: string, allowHash = false) {
  const operation = useRef<Promise<CreatedProductRow[]> | null>(null);
  const [state, setState] = useState<{ status: 'saving' | 'success' | 'error'; products: CreatedProductRow[]; error: string }>({ status: 'saving', products: [], error: '' });

  useEffect(() => {
    let active = true;
    if (!operation.current) {
      operation.current = Promise.resolve().then(() => importDesignProducts(creatorId, consumeDesignPayload(storageKey, allowHash)));
    }
    operation.current.then(products => {
      if (active) setState({ status: 'success', products, error: '' });
    }).catch(error => {
      if (active) setState({ status: 'error', products: [], error: error instanceof Error ? error.message : 'Failed to import products' });
    });
    return () => { active = false; };
  }, [creatorId, storageKey, allowHash]);

  return state;
}
