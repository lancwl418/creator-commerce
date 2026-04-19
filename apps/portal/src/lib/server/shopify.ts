import { SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } from '@/lib/constants';
import { extractShopDomain } from '@/lib/utils';

interface StoreConnectionForRefresh {
  id: string;
  store_url: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

interface RefreshResult {
  accessToken: string;
  updated: boolean;
  updateFields?: {
    access_token: string;
    refresh_token: string;
    token_expires_at: string | null;
  };
}

/**
 * Get a valid access token for a store connection, refreshing if expired.
 * Returns the token and any fields that need to be persisted.
 */
export async function getValidAccessToken(connection: StoreConnectionForRefresh): Promise<RefreshResult> {
  // Token still valid
  if (!connection.token_expires_at || new Date(connection.token_expires_at) > new Date()) {
    return { accessToken: connection.access_token, updated: false };
  }

  // Token expired, need refresh
  if (!connection.refresh_token) {
    throw new Error('Token expired and no refresh token available. Please reconnect the store.');
  }

  const shopDomain = extractShopDomain(connection.store_url);
  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed. Please reconnect the store.');
  }

  const data = await res.json();

  return {
    accessToken: data.access_token,
    updated: true,
    updateFields: {
      access_token: data.access_token,
      refresh_token: data.refresh_token || connection.refresh_token,
      token_expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : connection.token_expires_at,
    },
  };
}
