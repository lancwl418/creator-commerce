import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  buildAuthorizeUrl,
  buildStoreConnection,
  normalizeShopDomain,
  shopifyAppConfigFromEnv,
  verifyOAuthHmac,
} from '@creator-commerce/shared/shopify';

const config = { clientId: 'cid', clientSecret: 'secret', scopes: 'write_products,read_orders', apiVersion: '2024-10' };

describe('共享 Shopify 授权', () => {
  it('店铺域名：补全 myshopify.com、去掉协议和路径、拒绝其他域名', () => {
    expect(normalizeShopDomain(' MyStore ')).toBe('mystore.myshopify.com');
    expect(normalizeShopDomain('https://mystore.myshopify.com/admin')).toBe('mystore.myshopify.com');
    expect(normalizeShopDomain('mystore.example.com')).toBeNull();
    expect(normalizeShopDomain('')).toBeNull();
  });

  it('没有 app 凭据时报错，不用空字符串调用 Shopify', () => {
    expect(() => shopifyAppConfigFromEnv({})).toThrow('SHOPIFY_CLIENT_ID');
    expect(shopifyAppConfigFromEnv({ SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'secret' })).toMatchObject({
      clientId: 'cid', scopes: 'write_products,read_products,read_orders', apiVersion: '2024-10',
    });
  });

  it('授权地址带上 client_id、scope、回调地址和 state', () => {
    const url = new URL(buildAuthorizeUrl(config, 'mystore.myshopify.com', 'https://cn.example.com/api/shopify/callback', 'nonce'));
    expect(url.origin + url.pathname).toBe('https://mystore.myshopify.com/admin/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'cid', scope: 'write_products,read_orders',
      redirect_uri: 'https://cn.example.com/api/shopify/callback', state: 'nonce',
    });
  });

  it('回调签名按 Shopify 规则校验', () => {
    const params = new URLSearchParams({ code: 'c', shop: 'mystore.myshopify.com', state: 's', timestamp: '1' });
    const message = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
    params.set('hmac', crypto.createHmac('sha256', config.clientSecret).update(message).digest('hex'));
    expect(verifyOAuthHmac(config, params)).toBe(true);
    params.set('shop', 'other.myshopify.com');
    expect(verifyOAuthHmac(config, params)).toBe(false);
    params.delete('hmac');
    expect(verifyOAuthHmac(config, params)).toBe(false);
  });

  it('店铺连接记录带上 token 有效期和店铺地址', () => {
    const row = buildStoreConnection('creator-1', 'mystore.myshopify.com', 'My Store', {
      accessToken: 'at', refreshToken: 'rt', scopes: ['write_products'], expiresIn: 3600, refreshTokenExpiresIn: 86400,
    });
    expect(row).toMatchObject({
      creator_id: 'creator-1', platform: 'shopify', store_name: 'My Store', store_url: 'https://mystore.myshopify.com',
      access_token: 'at', refresh_token: 'rt', scopes: ['write_products'], status: 'connected',
      metadata: { expires_in: 3600, refresh_token_expires_in: 86400, token_type: 'expiring' },
    });
    expect(row.token_expires_at).not.toBeNull();
  });
});
