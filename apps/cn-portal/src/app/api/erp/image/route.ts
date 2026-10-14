import { proxyErpImage } from '@creator-commerce/shared/erp';
import { erpThumbnailRedirect } from '@/lib/erp-thumb.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const width = Number(searchParams.get('w'));

  // 带 w 的请求走缩略图（R2 缓存的小 webp）；生成失败时落回原始代理。
  if (path && Number.isInteger(width) && width > 0 && width <= 2000) {
    try {
      const redirect = await erpThumbnailRedirect(path, width);
      if (redirect) return redirect;
    } catch (err) {
      console.warn('[cn-portal] 缩略图生成失败，回退原始代理', err);
    }
  }

  return proxyErpImage(request);
}
