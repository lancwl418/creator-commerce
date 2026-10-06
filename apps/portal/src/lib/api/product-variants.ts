import type { ProductVariantsResponse } from '@/lib/types/product';

export async function fetchProductVariants(templateId: string, signal?: AbortSignal): Promise<ProductVariantsResponse> {
  const response = await fetch(`/api/erp/product-skus?template_id=${encodeURIComponent(templateId)}`, { signal });
  const data: Partial<ProductVariantsResponse> & { error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || `Failed to fetch SKUs (${response.status})`);
  return { skus: data.skus ?? [], option_names: data.option_names ?? [] };
}
