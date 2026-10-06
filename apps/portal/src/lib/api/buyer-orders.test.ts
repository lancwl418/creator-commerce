import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBuyerOrders } from './buyer-orders';

afterEach(() => vi.unstubAllGlobals());

describe('buyer orders 请求', () => {
  it('保留未关联账号的状态，而不是误判为加载失败', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ linked: false, orders: [] })));
    expect(await fetchBuyerOrders()).toEqual({ linked: false, orders: [] });
  });

  it.each([200, 401, 502])('错误响应不能进入 ready 状态（HTTP %s）', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Not authenticated' }, { status })));
    await expect(fetchBuyerOrders()).rejects.toThrow('Not authenticated');
  });

  it('拒绝缺少订单集合的响应，防止渲染 map 时崩溃', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ linked: true })));
    await expect(fetchBuyerOrders()).rejects.toThrow('Invalid orders response');
  });
});
