import { afterEach, describe, expect, it, vi } from 'vitest';
import { cacheErpProducts, fetchErpProduct, fetchErpProducts } from './erp-products';

afterEach(() => vi.unstubAllGlobals());

describe('ERP product requests', () => {
  it.each(['records', 'list'])('reads the %s collection inside result', async key => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, result: { [key]: [{ id: 'p101' }], total: 101, pages: 3 } })));
    expect(await fetchErpProducts(3, 40)).toMatchObject({ records: [{ id: 'p101' }], total: 101, pages: 3, current: 3 });
  });
  it('does not turn an ERP failure into an empty catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, message: 'Unavailable' })));
    await expect(fetchErpProducts()).rejects.toThrow('Unavailable');
  });
  it('rejects malformed successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, result: {} })));
    await expect(fetchErpProducts()).rejects.toThrow('Invalid ERP');
  });
  it('uses the detail endpoint rather than searching only page one', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ product: { id: 'p101' } }));
    vi.stubGlobal('fetch', fetcher);
    expect(await fetchErpProduct('p101')).toEqual({ id: 'p101' });
    expect(fetcher).toHaveBeenCalledWith('/api/erp/products/p101', { signal: undefined });
  });
  it('does not open an editor with a failed or missing cache key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Cache unavailable' }, { status: 503 })));
    await expect(cacheErpProducts([])).rejects.toThrow('Cache unavailable');
  });
});
