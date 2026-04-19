import { SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } from '@/lib/constants';

/** Extract shop domain from a store URL (remove protocol and trailing slash) */
export function extractShopDomain(storeUrl: string | null | undefined): string {
  return (storeUrl || '')
    .replace('https://', '')
    .replace('http://', '')
    .replace(/\/$/, '');
}

/** Refresh an expired Shopify access token. Returns new token or null on failure. */
export async function refreshShopifyToken(
  shopDomain: string,
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  return res.json();
}
