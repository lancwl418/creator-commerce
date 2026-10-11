/**
 * 订单 webhook 统一指向 Creator Portal（它负责把各店铺的订单回流到 creator_orders），
 * 所以这里取 Creator Portal 的对外地址，而不是 cn-portal 自己的。
 */
export function getOrderWebhookBaseUrl(): string | null {
  const configured = process.env.SHOPIFY_WEBHOOK_BASE_URL?.trim() || process.env.APP_URL?.trim();
  return configured ? configured.replace(/\/$/, '') : null;
}
