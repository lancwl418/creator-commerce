import { createClient } from '@/lib/supabase/client';
import type { ProductData, ProductDraftInput } from '@/lib/types/product';
import { buildProductDraftUpdate } from './productDraft';
import type { DesignEditorPayload } from '@creator-commerce/shared';
import type { ImportedProductEdit } from '@/lib/types/product-import';
import { buildImportedProductUpdate } from './importPayload';
import { createProductsFromDesignPayload, updateProductFromDesignPayload } from './createFromDesignPayload';

export async function duplicateProduct(productId: string): Promise<string> {
  const response = await fetch(`/api/products/${productId}/duplicate`, { method: 'POST' });
  const data: { id?: string; error?: string } = await response.json();
  if (!response.ok || !data.id) throw new Error(data.error || 'Failed to duplicate product');
  return data.id;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await createClient()
    .from('sellable_product_instances').delete().eq('id', productId);
  if (error) throw new Error(error.message);
}

export async function saveProductDraft(product: ProductData, input: ProductDraftInput): Promise<void> {
  const update = buildProductDraftUpdate(product, input);
  const { error } = await createClient()
    .from('sellable_product_instances').update(update).eq('id', product.id);
  if (error) throw new Error(error.message);
}

export async function saveImportedProduct(id: string, edit: ImportedProductEdit) {
  const update = buildImportedProductUpdate(edit);
  const { error } = await createClient().from('sellable_product_instances')
    .update({ ...update, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  return update;
}

export async function importDesignProducts(creatorId: string, payload: DesignEditorPayload) {
  const products = await createProductsFromDesignPayload(createClient(), creatorId, payload);
  if (!products.length) throw new Error('Failed to create products');
  return products;
}

export async function saveProductDesign(productId: string, payload: DesignEditorPayload): Promise<void> {
  const saved = await updateProductFromDesignPayload(createClient(), productId, payload);
  if (!saved) throw new Error('Failed to save design');
}
