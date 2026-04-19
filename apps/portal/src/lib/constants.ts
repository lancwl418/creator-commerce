// ── Pricing ──
export const DEFAULT_COST = 10.00;
export const PRICE_MULTIPLIER = 2.5;
export const ROYALTY_RATE = 0.15;

// ── ERP ──
export const ERP_API_BASE_URL = process.env.ERP_API_BASE_URL ?? 'http://118.195.245.201:8081/ideamax';
export const ERP_IMAGE_BASE_URL = `${ERP_API_BASE_URL}/sys/common/static/`;

// ── Shopify ──
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
export const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
export const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
export const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES ?? 'write_products,read_products,read_orders';

// ── UI Status Colors ──
export const ORDER_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  pending: 'bg-yellow-50 text-yellow-700',
  refunded: 'bg-red-50 text-red-600',
  voided: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-600',
};

export const FULFILLMENT_STATUS_COLORS: Record<string, string> = {
  fulfilled: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  unfulfilled: 'bg-gray-100 text-gray-600',
};

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-blue-50 text-blue-700',
  listed: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
};
