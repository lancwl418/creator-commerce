import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncProductToStore, unlistProductFromStore } from './product-listings';

afterEach(() => vi.unstubAllGlobals());

describe('store listing requests', () => {
  it('preserves draft publishing and returns the published product URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ shopify_url: 'https://store.example/products/shirt' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await syncProductToStore('p1', 'store1', 'draft')).toBe('https://store.example/products/shirt');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ product_instance_id: 'p1', store_connection_id: 'store1', publish_status: 'draft' });
  });
  it('reports a missing URL instead of showing a false success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})));
    await expect(syncProductToStore('p1', 'store1', 'active')).rejects.toThrow('missing the store URL');
  });
  it.each(['sync', 'unlist'])('propagates a %s failure', async action => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Store disconnected' }, { status: 400 })));
    const request = action === 'sync' ? syncProductToStore('p1', 's1', 'active') : unlistProductFromStore('p1', 's1');
    await expect(request).rejects.toThrow('Store disconnected');
  });
});
