/**
 * ERP 原始图片路径 → 本站图片代理 URL。
 * 传 width 时走缩略图分支（代理层 resize 成小 webp 并缓存到 R2，见 api/erp/image 路由）。
 */
export function erpImage(path: string | null | undefined, width?: number): string | null {
  if (!path) return null;
  const w = width ? `&w=${width}` : '';
  return `/api/erp/image?path=${encodeURIComponent(path)}${w}`;
}
