export interface TtlCache<T> {
  /**
   * 新鲜的条目直接返回；过期但未超过 staleMs 的条目先返回旧值、后台重新加载一次；
   * 更旧或不存在的条目调用 load 等待结果。并发的相同 key 共用一次加载。
   */
  get(key: string, load: () => Promise<T>): Promise<T>;
  set(key: string, value: T): void;
}

export interface TtlCacheOptions {
  /** 过期后还能继续拿旧值顶多多久（stale-while-revalidate），默认 0 即过期就同步重载 */
  staleMs?: number;
  now?: () => number;
}

interface Entry<T> {
  fresh: number;
  expires: number;
  value: Promise<T>;
  refreshing?: Promise<T>;
}

/**
 * 进程内 TTL 缓存。加载失败不缓存；超过 maxEntries 时淘汰最早写入的条目，
 * 避免 URL 里的任意参数把缓存撑大。
 */
export function createTtlCache<T>(
  ttlMs: number,
  maxEntries: number,
  { staleMs = 0, now = Date.now }: TtlCacheOptions = {}
): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();

  function store(key: string, value: Promise<T>) {
    const at = now();
    entries.delete(key);
    entries.set(key, { fresh: at + ttlMs, expires: at + ttlMs + staleMs, value });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
  }

  function refreshInBackground(key: string, hit: Entry<T>, load: () => Promise<T>) {
    const next = load();
    hit.refreshing = next;
    next.then(
      (value) => { if (entries.get(key) === hit) store(key, Promise.resolve(value)); },
      () => { if (entries.get(key) === hit) hit.refreshing = undefined; }
    );
  }

  return {
    get(key, load) {
      const hit = entries.get(key);
      const at = now();
      if (hit && hit.expires > at) {
        if (hit.fresh <= at && !hit.refreshing) refreshInBackground(key, hit, load);
        return hit.value;
      }
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
