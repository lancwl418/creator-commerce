import type { DesignEditorPayload } from '@creator-commerce/shared';
import type { ImportedProductEdit } from '@/lib/types/product-import';

export function parseDesignPayload(value: unknown): DesignEditorPayload {
  const payload: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!payload || typeof payload !== 'object' || !('products' in payload)
    || !Array.isArray(payload.products) || !payload.products.length
    || !payload.products.every(product => product && typeof product === 'object' && typeof product.template_id === 'string')) {
    throw new Error('No valid products received from the editor');
  }
  return payload as DesignEditorPayload;
}

export function consumeDesignPayload(key: string, allowHash = false): DesignEditorPayload {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key);
    if (raw) sessionStorage.removeItem(key);
  } catch { /* Hash remains available when browser storage is disabled. */ }
  if (!raw && allowHash && window.location.hash) raw = decodeURIComponent(window.location.hash.slice(1));
  if (!raw) throw new Error('No design data received');
  return parseDesignPayload(raw);
}

export function buildImportedProductUpdate(edit: ImportedProductEdit) {
  const price = edit.price.trim() === '' ? null : Number(edit.price);
  if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error('Please enter a valid price');
  return { title: edit.title.trim(), description: edit.description.trim(), base_price_suggestion: price };
}
