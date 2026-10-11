import crypto from 'node:crypto';

// Shopify OAuth（店铺授权）的服务端逻辑，Creator Portal 与 cn-portal 共用同一个 Shopify App。
// 各 app 的路由只负责：确认登录用户、决定回调地址和落地页、写 cookie 与数据库。

export interface ShopifyAppConfig {
  clientId: string;
  clientSecret: string;
  scopes: string;
  apiVersion: string;
}

export const DEFAULT_SHOPIFY_API_VERSION = '2024-10';
export const DEFAULT_SHOPIFY_SCOPES = 'write_products,read_products,read_orders';

export function shopifyAppConfigFromEnv(env: Record<string, string | undefined> = process.env): ShopifyAppConfig {
  const clientId = env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Missing environment variable: SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET');
  }
  return {
    clientId,
    clientSecret,
    scopes: env.SHOPIFY_SCOPES?.trim() || DEFAULT_SHOPIFY_SCOPES,
    apiVersion: env.SHOPIFY_API_VERSION?.trim() || DEFAULT_SHOPIFY_API_VERSION,
  };
}

/** 授权过程中用来核对回调的 cookie 名；两个 app 一致，便于共用回调逻辑。 */
export const SHOPIFY_OAUTH_COOKIES = {
  state: 'shopify_oauth_state',
  creator: 'shopify_oauth_creator',
  shop: 'shopify_oauth_shop',
} as const;

/** 授权 cookie 的有效期（秒）：商家需要在这段时间内完成授权 */
export const SHOPIFY_OAUTH_COOKIE_MAX_AGE = 600;

export function createOAuthState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(cfg: ShopifyAppConfig, shop: string, redirectUri: string, state: string): string {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('scope', cfg.scopes);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

/** 核对 Shopify 回调参数的签名：除 hmac 外按 key 排序拼接，用 app secret 做 HMAC-SHA256。 */
export function verifyOAuthHmac(cfg: ShopifyAppConfig, searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;
  const message = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const expected = crypto.createHmac('sha256', cfg.clientSecret).update(message).digest('hex');
  return expected.length === hmac.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
}

export interface ShopifyTokenGrant {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  /** access token 有效期（秒）；Shopify 2025 起的 expiring token 约 1 小时 */
  expiresIn?: number;
  refreshTokenExpiresIn?: number;
}

/** 用授权码换 expiring offline access token。失败时抛出带 Shopify 响应的错误。 */
export async function exchangeAccessToken(cfg: ShopifyAppConfig, shop: string, code: string): Promise<ShopifyTokenGrant> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code, expiring: 1 }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as {
    access_token: string; scope?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    scopes: data.scope ? data.scope.split(',') : [],
    expiresIn: data.expires_in,
    refreshTokenExpiresIn: data.refresh_token_expires_in,
  };
}

/** 店铺显示名；取不到时用店铺域名。 */
export async function fetchShopName(cfg: ShopifyAppConfig, shop: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(`https://${shop}/admin/api/${cfg.apiVersion}/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });
    if (!res.ok) return shop;
    const { shop: data } = (await res.json()) as { shop?: { name?: string } };
    return data?.name || shop;
  } catch {
    return shop;
  }
}

export const ORDER_WEBHOOK_TOPICS = ['orders/create', 'orders/paid', 'orders/updated', 'orders/cancelled'] as const;

export interface WebhookRegistration {
  topic: string;
  ok: boolean;
  status?: number;
  error?: string;
}

/** 逐个注册订单 webhook；单个失败不中断，由调用方决定如何记录。 */
export async function registerOrderWebhooks(
  cfg: ShopifyAppConfig,
  shop: string,
  accessToken: string,
  address: string
): Promise<WebhookRegistration[]> {
  const results: WebhookRegistration[] = [];
  for (const topic of ORDER_WEBHOOK_TOPICS) {
    try {
      const res = await fetch(`https://${shop}/admin/api/${cfg.apiVersion}/webhooks.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
        body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
      });
      results.push(res.ok ? { topic, ok: true } : { topic, ok: false, status: res.status, error: await res.text() });
    } catch (error) {
      results.push({ topic, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

/** creator_store_connections 的 upsert 行（按 creator_id + platform 唯一） */
export function buildStoreConnection(creatorId: string, shop: string, storeName: string, grant: ShopifyTokenGrant) {
  return {
    creator_id: creatorId,
    platform: 'shopify' as const,
    store_name: storeName,
    store_url: `https://${shop}`,
    access_token: grant.accessToken,
    refresh_token: grant.refreshToken,
    scopes: grant.scopes,
    status: 'connected' as const,
    token_expires_at: grant.expiresIn ? new Date(Date.now() + grant.expiresIn * 1000).toISOString() : null,
    metadata: {
      expires_in: grant.expiresIn,
      refresh_token_expires_in: grant.refreshTokenExpiresIn,
      token_type: 'expiring',
    },
    connected_at: new Date().toISOString(),
  };
}

export interface ShopifyRefreshedToken {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
}

/** 用 refresh token 换新的 access token（expiring token 约 1 小时过期）。失败时抛错。 */
export async function refreshAccessToken(cfg: ShopifyAppConfig, shop: string, refreshToken: string): Promise<ShopifyRefreshedToken> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token refresh failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresIn: data.expires_in };
}

/** 从 store_url（https://xxx.myshopify.com/）取出店铺域名 */
export function shopDomainFromStoreUrl(storeUrl: string | null | undefined): string {
  return (storeUrl ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}
