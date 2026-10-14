import crypto from 'node:crypto';
import sharp from 'sharp';
import { erpBaseUrlFromEnv, resolveErpImageSource } from '@creator-commerce/shared/erp';
import { r2ObjectExists, r2PublicUrl, uploadToR2AtKey } from '@creator-commerce/shared/storage/r2';

const IMMUTABLE_YEAR = 'public, max-age=31536000, immutable';

function extraOrigins(): string[] {
  return (process.env.ERP_IMAGE_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function thumbKey(path: string, width: number): string {
  const hash = crypto.createHash('sha256').update(path).digest('hex').slice(0, 32);
  return `erp-thumb/w${width}/${hash}.webp`;
}

function redirectTo(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': IMMUTABLE_YEAR } });
}

/**
 * 产品图缩略图：优先用 R2 里缓存的小 webp，首次生成后对所有用户永久可用，
 * 不依赖 Render 实例本地缓存（免费实例会休眠 / 部署即清空）。
 *
 * 命中缓存 → 直接 302 到 R2；未命中 → 拉 ERP 原图 → sharp 缩成 webp → 存 R2 → 302。
 * 无法解析源或拉取失败时返回 null，交回原始代理兜底。
 */
export async function erpThumbnailRedirect(path: string, width: number): Promise<Response | null> {
  const key = thumbKey(path, width);
  if (await r2ObjectExists(key)) return redirectTo(r2PublicUrl(key));

  const source = resolveErpImageSource(path, erpBaseUrlFromEnv(), extraOrigins());
  if (!source) return null;

  // 不跟随重定向，避免允许的源跳到未允许地址。
  const res = await fetch(source, { redirect: 'error' });
  if (!res.ok) return null;

  const input = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(input)
    .rotate() // 按 EXIF 方向校正
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();

  const url = await uploadToR2AtKey(new Uint8Array(webp), key, 'image/webp');
  return redirectTo(url);
}
