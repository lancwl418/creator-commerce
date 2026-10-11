/** Shopify 店铺域名规则：xxx.myshopify.com */
export const SHOPIFY_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: string): boolean {
  return SHOPIFY_DOMAIN_PATTERN.test(shop);
}

/**
 * 把用户输入整理成店铺域名：去掉协议和路径，只给了店铺名时补 .myshopify.com。
 * 整理后仍不合法返回 null。
 */
export function normalizeShopDomain(input: string): string | null {
  let domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (domain && !domain.includes('.')) domain = `${domain}.myshopify.com`;
  return isValidShopDomain(domain) ? domain : null;
}
