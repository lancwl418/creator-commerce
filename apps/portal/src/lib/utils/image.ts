/**
 * Resolve an ERP image path to a portal-accessible URL.
 * Handles: full HTTP/HTTPS URLs, design-engine proxy URLs, relative ERP paths.
 */
export function resolveErpImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Convert design-engine proxy URLs (/api/erp-image) to portal format (/api/erp/image)
  if (path.startsWith('/api/erp-image?')) {
    return path.replace('/api/erp-image?', '/api/erp/image?');
  }
  if (path.startsWith('/api/')) return path;
  return `/api/erp/image?path=${encodeURIComponent(path)}`;
}

/**
 * Convert an ERP image path to a publicly accessible HTTPS URL.
 * Used when pushing images to external services (Shopify, etc.) that
 * need to download the image from a public URL.
 */
export function toPublicImageUrl(path: string, appUrl: string): string {
  if (!path) return '';
  if (path.startsWith('https://')) return path;
  if (path.startsWith('http://')) {
    const match = path.match(/\/sys\/common\/static\/(.+)$/);
    if (match) path = match[1];
    else return '';
  }
  return `${appUrl}/api/erp/image?path=${encodeURIComponent(path)}`;
}
