import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { resolveTierPriceTables, type SellerTier } from '@creator-commerce/shared/erp/pricing';

/** 印刷面：ERP printPositions 里的位置名（front / back / left / right / full …） */
export interface PrintFace {
  face: string;
}

const DEFAULT_FACES = ['front'];

/** 产品的印刷位置；ERP 以 JSON 字符串返回，无法解析或为空时按只有正面处理。 */
export function getPrintPositions(product: Pick<ErpProduct, 'printPositions'>): string[] {
  const raw = product.printPositions;
  const list = Array.isArray(raw) ? raw : (() => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const faces = list.filter((f): f is string => typeof f === 'string' && f.trim() !== '').map((f) => f.trim().toLowerCase());
  return faces.length > 0 ? [...new Set(faces)] : DEFAULT_FACES;
}

/** 该等级下报了几面的印花价（face_1 … face_N 的最大 N） */
export function getPricedFaceCount(product: ErpProduct, tier: SellerTier): number {
  let max = 0;
  for (const rows of resolveTierPriceTables(product, tier)) {
    for (const row of rows) {
      for (const craft of row.prints) for (const face of craft.faces) max = Math.max(max, face.faces);
    }
  }
  return max;
}

/** 可以上传设计的面：印刷位置列表，裁到有报价的面数以内 */
export function getUploadableFaces(product: ErpProduct, tier: SellerTier): PrintFace[] {
  const positions = getPrintPositions(product);
  const priced = getPricedFaceCount(product, tier);
  return positions.slice(0, Math.max(0, priced)).map((face) => ({ face }));
}
