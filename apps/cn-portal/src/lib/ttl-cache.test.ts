import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from './ttl-cache';

describe('进程内 TTL 缓存', () => {
  it('有效期内只加载一次，过期后重新加载', async () => {
    let time = 0;
    const cache = createTtlCache<number>(1000, 10, () => time);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    expect(await cache.get('k', load)).toBe(1);
    time = 999;
    expect(await cache.get('k', load)).toBe(1);
    time = 1000;
    expect(await cache.get('k', load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('并发的相同 key 共用一次加载', async () => {
    const cache = createTtlCache<number>(1000, 10);
    const load = vi.fn(async () => 7);
    expect(await Promise.all([cache.get('k', load), cache.get('k', load)])).toEqual([7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('加载失败不缓存，下次重试', async () => {
    const cache = createTtlCache<number>(1000, 10);
    await expect(cache.get('k', async () => { throw new Error('ERP down'); })).rejects.toThrow('ERP down');
    expect(await cache.get('k', async () => 3)).toBe(3);
  });

  it('set 写入的值可直接命中，超过上限淘汰最早的条目', async () => {
    const cache = createTtlCache<string>(1000, 2);
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.set('c', 'C');
    const load = vi.fn(async () => 'reloaded');
    expect(await cache.get('c', load)).toBe('C');
    expect(await cache.get('b', load)).toBe('B');
    expect(load).not.toHaveBeenCalled();
    expect(await cache.get('a', load)).toBe('reloaded');
  });
});
