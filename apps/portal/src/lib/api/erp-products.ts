import type { ErpProduct, ErpProductPage, ErpProductsResponse } from '@/lib/types/catalog';

export async function fetchErpProducts(pageNo = 1, pageSize = 40, signal?: AbortSignal): Promise<ErpProductPage> {
  const response = await fetch(`/api/erp/products?${new URLSearchParams({ pageNo: String(pageNo), pageSize: String(pageSize) })}`, { signal });
  const data: ErpProductsResponse = await response.json();
  if (!response.ok || !data.success || !data.result) {
    throw new Error(data.error || data.message || `Failed to load products (${response.status})`);
  }
  const records = data.result.records ?? data.result.list;
  if (!Array.isArray(records)) throw new Error('Invalid ERP product response');
  const total = data.result.total ?? records.length;
  return { records, total, pages: data.result.pages ?? Math.max(1, Math.ceil(total / pageSize)), current: pageNo };
}

export async function fetchErpProduct(id: string, signal?: AbortSignal): Promise<ErpProduct> {
  const response = await fetch(`/api/erp/products/${encodeURIComponent(id)}`, { signal });
  const data: { product?: ErpProduct; error?: string } = await response.json();
  if (!response.ok || !data.product) throw new Error(data.error || 'Product not found');
  return data.product;
}

export async function cacheErpProducts(products: ErpProduct[], signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/erp/products-cache', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products }), signal,
  });
  const data: { key?: string; error?: string } = await response.json();
  if (!response.ok || !data.key) throw new Error(data.error || 'Failed to prepare products for the editor');
  return data.key;
}
