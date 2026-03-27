export function resolveErpImageUrl(relativePath: string): string {
  if (!relativePath) return '';
  return `/api/erp-image?path=${encodeURIComponent(relativePath)}`;
}
