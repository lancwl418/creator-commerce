import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchExternalProducts } from './external-products';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('external product sources', () => {
  it('reads ERP result records and reports an unavailable Shopify source', async () => {
    vi.stubEnv('NEXT_PUBLIC_DESIGN_ENGINE_URL', 'https://editor.example');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.startsWith('/api/erp/')
      ? Response.json({ success: true, result: { records: [{ id: '101', title: 'Shirt', mainPic: '', prodImageList: [], prodSkuList: [{ price: null }] }] } })
      : Response.json({ error: 'Shopify unavailable' }, { status: 503 })));
    const result = await fetchExternalProducts();
    expect(result.products).toMatchObject([{ id: 'erp-101', name: 'Shirt', base_cost: null }]);
    expect(result.warnings).toEqual(['Shopify unavailable']);
  });
  it('reports both failures instead of silently presenting a successful empty load', async () => {
    vi.stubEnv('NEXT_PUBLIC_DESIGN_ENGINE_URL', 'https://editor.example');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const result = await fetchExternalProducts();
    expect(result.products).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });
});
