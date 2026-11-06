import { resolveOptionDimensions } from './options';
import type { ErpProduct, ErpSupplierQuote } from './types';

// 供应商（工厂）成本解析：从产品的各家供应商报价里算某个 SKU 的工厂成本，
// 用于内部后台按工厂比价 / 选推送工厂。成本数据只能在服务端和内部后台使用。

export interface SupplierSkuCost {
  /** 空白件工厂成本；报价覆盖不到该 SKU 时为 null */
  blank: number | null;
  /** faces 面印花工厂成本；faces = 0 或报价没有对应面数时为 null */
  print: number | null;
  /** 印花成本取自哪个工艺（多工艺时取最便宜的） */
  craftName: string | null;
  /** blank +（faces > 0 时的）print；任一缺失为 null */
  unit: number | null;
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 一家供应商报价下某个 SKU 的工厂成本：空白件价 +（设计了 faces 面时的）印花价。
 * 空白件价按「尺码档 → 色档」解析；印花价从 crafts[].costByTier 取 face_N，
 * 色档明细优先于档位整档价。
 */
export function resolveSupplierSkuCost(
  product: ErpProduct,
  quote: ErpSupplierQuote,
  skuId: string,
  faces: number
): SupplierSkuCost {
  const none: SupplierSkuCost = { blank: null, print: null, craftName: null, unit: null };
  const sku = (product.prodSkuList ?? []).find((s) => s.id === skuId);
  if (!sku) return none;

  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;
  const size = sizeKey ? sku[sizeKey] : null;
  const color = colorKey ? sku[colorKey] : null;

  const sizeTiers = quote.sizeTiers ?? [];
  // 尺码档按成员匹配；仅当产品不分尺码或档位没列成员时，唯一档才可直接用
  // （尺码明确不在任何档位 = 该工厂没报这个尺码的价，不能回落）
  const sizeTier =
    sizeTiers.find((tier) => size != null && (tier.memberSizes ?? []).includes(size)) ??
    (sizeTiers.length === 1 && (size == null || (sizeTiers[0].memberSizes ?? []).length === 0)
      ? sizeTiers[0]
      : undefined);
  if (!sizeTier) return none;

  const colorTier = (sizeTier.colorTiers ?? []).find(
    (tier) => color != null && (tier.memberColors ?? []).includes(color)
  );
  const colorPrice = colorTier?.price;
  const tierPrice = sizeTier.price;
  const blank = isPrice(colorPrice) ? colorPrice : isPrice(tierPrice) ? tierPrice : null;

  let print: number | null = null;
  let craftName: string | null = null;
  if (faces > 0 && sizeTier.id) {
    for (const craft of quote.crafts ?? []) {
      const tierCost = craft.costByTier?.[sizeTier.id];
      if (!isRecord(tierCost)) continue;
      const colorCost = colorTier ? tierCost[colorTier.id] : undefined;
      const source = isRecord(colorCost) ? colorCost : tierCost;
      const value = source[`face_${faces}`] ?? tierCost[`face_${faces}`];
      if (isPrice(value) && (print === null || value < print)) {
        print = value;
        craftName = craft.name ?? null;
      }
    }
  }

  const unit = blank !== null && (faces === 0 || print !== null) ? blank + (print ?? 0) : null;
  return { blank, print, craftName, unit };
}
