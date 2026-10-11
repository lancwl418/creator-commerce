import { createProductsFromDesignPayload, type CreatedProductRow } from '@creator-commerce/shared/products';
import type { DesignEditorPayload } from '@creator-commerce/shared';
import { createClient } from '../supabase/client';

/** 建议售价倍率（与 Creator Portal 一致） */
export const PRICE_MULTIPLIER = 2.5;

/** data: URL → 本站 /api/upload-r2 → 公网地址；https 原样返回，blob: 丢弃 */
async function uploadDataUrl(value: string | undefined | null, folder: string): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith('data:')) return value.startsWith('blob:') ? null : value;
  const res = await fetch('/api/upload-r2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data_url: value, folder }),
  });
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url?: string };
  return url ?? null;
}

/** 设计器保存后在浏览器里建产品记录（草稿），返回建好的行。 */
export async function createDesignedProducts(creatorId: string, payload: DesignEditorPayload): Promise<CreatedProductRow[]> {
  const products = await createProductsFromDesignPayload(createClient(), creatorId, payload, { uploadDataUrl, priceMultiplier: PRICE_MULTIPLIER });
  if (products.length === 0) throw new Error('Failed to create products');
  return products;
}
