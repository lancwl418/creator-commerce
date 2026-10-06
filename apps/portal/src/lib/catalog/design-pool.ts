import type { DesignPoolItem, ErpProduct } from '@/lib/types/catalog';
import { getImageUrl, getProductName } from './product';

export function addProductToDesignPool(product: ErpProduct): void {
  let pool: DesignPoolItem[] = [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('design_pool') || '[]');
    if (Array.isArray(stored)) pool = stored.filter((item): item is DesignPoolItem => item != null && typeof item.id === 'string' && typeof item.name === 'string');
  } catch { /* Replace malformed persisted data with a valid pool. */ }
  if (!pool.some(item => item.id === product.id)) {
    pool.push({ id: product.id, name: getProductName(product), thumbnail: getImageUrl(product) });
    localStorage.setItem('design_pool', JSON.stringify(pool));
  }
}
