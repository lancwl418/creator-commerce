// Shared types and utilities for Creator Commerce.
// Consumed by portal, design-engine, and (future) other hosts such as the
// Shopify app. This is the single source of truth for the embeddable Design
// Engine's host ⇄ editor contract — keep it host-agnostic.

export * from './design-engine-protocol';
export { readProductCost } from './product-pricing';

// ERP 产品数据客户端不在主 barrel 导出（含 node crypto，避免进客户端包）。
// 通过子路径引入：import { ... } from '@creator-commerce/shared/erp'
