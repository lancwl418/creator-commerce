import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignEditorPayload, DesignEditorProduct } from '@creator-commerce/shared';
import {
  createProductsFromDesignPayload as createProductsShared,
  suggestBasePrice as suggestBasePriceShared,
  updateProductFromDesignPayload as updateProductShared,
  type CreatedProductRow,
} from '@creator-commerce/shared/products';
import { PRICE_MULTIPLIER } from '@/lib/constants';

/**
 * Product/payload shapes emitted by the Design Engine. These come from the
 * shared host ⇄ editor contract (`@creator-commerce/shared`); aliased here for
 * local readability and backwards compatibility.
 */
export type DesignPayloadProduct = DesignEditorProduct;
export type DesignPayload = DesignEditorPayload;
export type { CreatedProductRow };

// The transforms themselves live in the shared package; re-exported for existing callers/tests.
export { buildProductTitle, cleanDescriptionHtml, deriveArtworkUrls, pickPreviewUrls } from '@creator-commerce/shared/products';

/** Suggested retail price uses the configured multiplier; missing costs stay unset. */
export function suggestBasePrice(baseCost: number | undefined): number | null {
  return suggestBasePriceShared(baseCost, PRICE_MULTIPLIER);
}

/**
 * Upload a data: URL to R2 and return the public URL. Pass-through for
 * already-hosted https URLs; drop transient blob: URLs.
 */
async function uploadDataUrlOrPassThrough(value: string | undefined | null, folder: string): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith('data:')) {
    return value.startsWith('blob:') ? null : value;
  }
  try {
    const res = await fetch('/api/upload-r2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_url: value, folder }),
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url ?? null;
  } catch (e) {
    console.error(`Upload failed (${folder}):`, e);
    return null;
  }
}

export function createProductsFromDesignPayload(supabase: SupabaseClient, creatorId: string, payload: DesignPayload) {
  return createProductsShared(supabase, creatorId, payload, { uploadDataUrl: uploadDataUrlOrPassThrough, priceMultiplier: PRICE_MULTIPLIER });
}

export function updateProductFromDesignPayload(supabase: SupabaseClient, productInstanceId: string, payload: DesignPayload) {
  return updateProductShared(supabase, productInstanceId, payload, { uploadDataUrl: uploadDataUrlOrPassThrough });
}
