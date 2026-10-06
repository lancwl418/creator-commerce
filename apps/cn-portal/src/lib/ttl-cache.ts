export interface TtlCache<T> {
  /** 命中未过期的条目直接返回；否则调用 load，并发的相同 key 共用这一次加载。 */
  get(key: string, load: () => Promise<T>): Promise<T>;
  set(key: string, value: T): void;
}

/**
 * 进程内 TTL 缓存。加载失败不缓存；超过 maxEntries 时淘汰最早写入的条目，
 * 避免 URL 里的任意参数把缓存撑大。
 */
export function createTtlCache<T>(
  ttlMs: number,
  maxEntries: number,
  now: () => number = Date.now
): TtlCache<T> {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();

  function store(key: string, value: Promise<T>) {
    entries.delete(key);
    entries.set(key, { expires: now() + ttlMs, value });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
  }

  return {
    get(key, load) {
      const hit = entries.get(key);
      if (hit && hit.expires > now()) return hit.value;
      const value = load();
      store(key, value);
      value.catch(() => {
        if (entries.get(key)?.value === value) entries.delete(key);
      });
      return value;
    },
    set(key, value) {
      store(key, Promise.resolve(value));
    },
  };
}
