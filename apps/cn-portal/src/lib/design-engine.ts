/** Design Engine 地址；服务端读取环境变量，客户端只拿到算好的 URL 和 origin。 */
export function getDesignEngineUrl(): string {
  const configured = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL;
  const value = configured || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
  if (!value) throw new Error('Design Engine URL is not configured');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Design Engine URL');
  return url.toString().replace(/\/$/, '');
}

/** 嵌入模式的编辑器地址：产品数据走本站的 products-cache，保存结果经 postMessage 回到本站。 */
export function buildEmbeddedEditorUrl(templates: string, cacheKey: string, origin: string): string {
  const url = new URL(`${getDesignEngineUrl()}/embed`);
  url.search = new URLSearchParams({
    templates,
    products_cache_key: cacheKey,
    products_cache_url: `${origin}/api/erp/products-cache`,
    parent_origin: origin,
  }).toString();
  return url.toString();
}
