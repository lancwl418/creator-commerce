import { describe, expect, it, vi } from 'vitest';
import { loadAllRows } from './platform-data';

describe('平台表加载', () => {
  it('真正的空表保留引导态', async () => {
    expect(await loadAllRows('stock', async () => ({ data: [], error: null }))).toEqual([]);
  });

  it('数据库错误不能变成空库存/全部可见', async () => {
    await expect(loadAllRows('stock', async () => ({ data: null, error: { message: 'permission denied' } }))).rejects.toThrow('Failed to load stock');
  });

  it('读取超过一页的记录，后续页错误也必须报错', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ sku: String(i) }));
    const query = vi.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [{ sku: '1000' }], error: null });
    expect(await loadAllRows('stock', query)).toHaveLength(1001);
    expect(query.mock.calls).toEqual([[0, 999], [1000, 1999]]);

    const failed = vi.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });
    await expect(loadAllRows('stock', failed)).rejects.toThrow('timeout');
  });
});
