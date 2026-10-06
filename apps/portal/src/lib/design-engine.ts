/** Public editor configuration; never import server credentials into UI modules. */
export function getDesignEngineUrl(): string {
  const configured = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL;
  const value = configured || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
  if (!value) throw new Error('Design Engine URL is not configured');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Design Engine URL');
  return url.toString().replace(/\/$/, '');
}

export function buildDesignEditorUrl(params: Record<string, string>): string {
  const url = new URL(`${getDesignEngineUrl()}/embed`);
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

export function buildCachedEditorUrl(templates: string, cacheKey: string, origin: string, embedded = true): string {
  return buildDesignEditorUrl({
    templates,
    products_cache_key: cacheKey,
    products_cache_url: `${origin}/api/erp/products-cache`,
    ...(embedded ? { parent_origin: origin } : { callback_url: `${origin}/api/products/import-redirect` }),
  });
}
