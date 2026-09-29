/** ERP 原始图片路径 → 本站图片代理 URL */
export function erpImage(path: string | null | undefined): string | null {
  if (!path) return null;
  return `/api/erp/image?path=${encodeURIComponent(path)}`;
}
