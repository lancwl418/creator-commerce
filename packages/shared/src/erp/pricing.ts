import type { ErpProduct, ErpPricingGroup } from './types';

// ── 卖家等级 ↔ ERP 客户等级（文档 4.1） ──
// 平台等级 1 → VIP，平台等级 2 → 批发商。ERP 侧等级组名为「VIP」「批发」「零售」。
export type SellerTier = 'VIP' | 'WHOLESALE';

/** 平台卖家等级 → ERP pricingGroup.name（客户等级名） */
export const TIER_TO_ERP_LEVEL_NAME: Record<SellerTier, string> = {
  VIP: 'VIP',
  WHOLESALE: '批发',
};

export interface PriceRange {
  min: number;
  max: number;
}

/**
 * 从一个定价组收集所有候选售价。
 *
 * 售价 = 空白衣售价(blankPrice，已按等级) + 印花售价(printPriceJson.face_1，已按等级)。
 * printPriceJson 两种形态：
 *   {"S~2XL":{"colorTiers":{"ct_x":{"face_1":8.24}}}}
 *   {"S~3XL":{"face_1":10.64,"face_2":11.97}}
 * 取 face_1（单面）作为选品展示的基准价；缺 face_1 时取该档最小 face_*。
 */
function collectGroupPrices(group: ErpPricingGroup): number[] {
  // tierCode → blankPrice（空白衣售价）
  const blankByTier = new Map<string, number>();
  for (const pt of group.pricingTiers ?? []) {
    if (isPrice(pt.blankPrice)) blankByTier.set(pt.tierCode, pt.blankPrice);
  }

  const prices: number[] = [];

  for (const rule of group.rules ?? []) {
    if (!rule.printPriceJson) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rule.printPriceJson);
    } catch {
      continue;
    }

    if (!isRecord(parsed)) continue;
    for (const [tierCode, tierVal] of Object.entries(parsed)) {
      if (!isRecord(tierVal)) continue;
      const blank = blankByTier.get(tierCode) ?? 0;

      // 收集本档下的所有 face_1（可能按色档嵌套）
      const faceSources: Record<string, unknown>[] = [];
      if (isRecord(tierVal.colorTiers)) {
        for (const ct of Object.values(tierVal.colorTiers)) {
          if (isRecord(ct)) faceSources.push(ct);
        }
      } else {
        faceSources.push(tierVal);
      }

      for (const src of faceSources) {
        const face = pickFace(src);
        if (face != null && isPrice(blank + face)) prices.push(blank + face);
      }
    }
  }

  return prices;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** 取 face_1；没有则取最小的 face_* 数值 */
function pickFace(src: Record<string, unknown>): number | null {
  if (isPrice(src.face_1)) return src.face_1;
  const faces = Object.entries(src)
    .filter(([k, v]) => k.startsWith('face_') && isPrice(v))
    .map(([, v]) => v as number);
  return faces.length ? Math.min(...faces) : null;
}

/**
 * 分层取价 —— 全系统唯一接缝。
 *
 * 返回该产品在指定卖家等级下的价格区间（min–max，覆盖各尺码/色档/供应商组）；
 * 该等级下取不到价格时返回 null（文档 4.1：缺价不显示 + 进缺价清单）。
 *
 * 数据来源：product.pricingGroups 中 name 匹配该等级、且带 printPriceJson 的组
 * （POD 供应商组）。分级倍率已由 ERP 算入 printPriceJson，无需再乘。
 */
export function resolveProductTierPrice(
  product: ErpProduct,
  tier: SellerTier
): PriceRange | null {
  const levelName = TIER_TO_ERP_LEVEL_NAME[tier];
  const groups = (product.pricingGroups ?? []).filter(
    (g) => g.name === levelName && (g.rules?.length ?? 0) > 0
  );

  const prices: number[] = [];
  for (const g of groups) prices.push(...collectGroupPrices(g));

  if (prices.length > 0) {
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  // 有分级定价/POD 的产品不能用通用 SKU 价绕过该等级缺价规则。
  if (product.pricingGroups?.length || product.pricingMode === 'pod_only') return null;

  // 非 POD、无分级组时，SKU 直接价才可作为兜底。
  const skuPrices = (product.prodSkuList ?? [])
    .map((s) => s.price)
    .filter(isPrice);
  if (skuPrices.length > 0) {
    return { min: Math.min(...skuPrices), max: Math.max(...skuPrices) };
  }

  return null; // 缺价
}
