// Status groups behind the three Created Products tabs.
export const PRODUCT_TABS = [
  { key: 'mockup', label: 'Mockup', statuses: ['draft'] },
  { key: 'unpublished', label: 'Unpublished', statuses: ['ready', 'paused', 'pending_review'] },
  { key: 'published', label: 'Published', statuses: ['listed', 'published'] },
] as const;

export type ProductTabKey = (typeof PRODUCT_TABS)[number]['key'];

/** Resolve a (possibly invalid) tab param to a known tab, defaulting to 'mockup'. */
export function resolveProductTab(tab: string | undefined | null): ProductTabKey {
  return PRODUCT_TABS.some((t) => t.key === tab) ? (tab as ProductTabKey) : 'mockup';
}

/** Does a product status belong to the given tab? */
export function productMatchesTab(status: string, tab: ProductTabKey): boolean {
  const def = PRODUCT_TABS.find((t) => t.key === tab);
  return def ? (def.statuses as readonly string[]).includes(status) : false;
}

/** Count products in each tab by status. */
export function countProductsByTab<T extends { status: string }>(
  products: T[],
): Record<ProductTabKey, number> {
  return Object.fromEntries(
    PRODUCT_TABS.map((t) => [
      t.key,
      products.filter((p) => (t.statuses as readonly string[]).includes(p.status)).length,
    ]),
  ) as Record<ProductTabKey, number>;
}
