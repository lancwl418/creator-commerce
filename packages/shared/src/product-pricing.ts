/** A supplied zero is valid; missing, empty, negative or non-finite costs are unknown. */
export function readProductCost(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const cost = Number(value);
  return Number.isFinite(cost) && cost >= 0 ? cost : undefined;
}
