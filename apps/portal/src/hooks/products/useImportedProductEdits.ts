'use client';

import { useRef, useState } from 'react';
import type { CreatedProductRow, ImportedProductEdit } from '@/lib/types/product-import';
import { saveImportedProduct } from '@/lib/products/mutations';

export function useImportedProductEdits(products: CreatedProductRow[]) {
  const [edits, setEdits] = useState<Record<string, ImportedProductEdit>>(() => Object.fromEntries(products.map(product => [product.id, {
    title: product.title || '', description: product.description || '',
    price: product.base_price_suggestion != null ? Number(product.base_price_suggestion).toFixed(2) : '',
  }])));
  const pending = useRef(new Set<string>());
  const [savingIds, setSavingIds] = useState(new Set<string>());
  const [savedIds, setSavedIds] = useState(new Set<string>());
  const [savingAll, setSavingAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateEdit(id: string, field: keyof ImportedProductEdit, value: string) {
    setEdits(previous => ({ ...previous, [id]: { ...previous[id], [field]: value } }));
    setSavedIds(previous => { const next = new Set(previous); next.delete(id); return next; });
    setErrors(previous => ({ ...previous, [id]: '' }));
  }

  async function handleQuickSave(id: string) {
    if (!edits[id] || pending.current.has(id)) return;
    pending.current.add(id);
    setSavingIds(new Set(pending.current));
    setErrors(previous => ({ ...previous, [id]: '' }));
    try {
      await saveImportedProduct(id, edits[id]);
      setSavedIds(previous => new Set(previous).add(id));
    } catch (err) {
      setErrors(previous => ({ ...previous, [id]: err instanceof Error ? err.message : 'Failed to save product' }));
    } finally {
      pending.current.delete(id);
      setSavingIds(new Set(pending.current));
    }
  }

  async function handleSaveAll() {
    if (savingAll || pending.current.size) return;
    setSavingAll(true);
    try { for (const product of products) await handleQuickSave(product.id); }
    finally { setSavingAll(false); }
  }

  return { edits, updateEdit, savingIds, savedIds, savingAll, errors, handleQuickSave, handleSaveAll };
}
