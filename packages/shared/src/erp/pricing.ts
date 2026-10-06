import { resolveOptionDimensions } from './options';
import type { ErpProduct, ErpPricingGroup, ErpSku } from './types';

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

export interface PrintFacePrice {
  /** 印刷面数：1 = 单面，2 = 双面… */
  faces: number;
  price: number;
}

export interface CraftPrintPrice {
  craftName: string;
  faces: PrintFacePrice[];
}

/** 一个「尺码档 × 色档」的价格明细；同一档内的 variant 价格相同。 */
export interface TierPriceRow {
  sizeTier: string;
  sizes: string[];
  /** 色档名称；该尺码档不分色档时为 null */
  colorTier: string | null;
  /** 属于该色档的颜色；无法从报价解析时为空数组 */
  colors: string[];
  /** 空白衣售价（已按等级）；ERP 未提供时为 null */
  blankPrice: number | null;
  /** 各工艺的印花售价（已按等级） */
  prints: CraftPrintPrice[];
}

/**
 * 把一个定价组展开成「尺码档 × 色档」的价格明细。
 *
 * printPriceJson 两种形态：
 *   {"S~2XL":{"colorTiers":{"ct_x":{"code":"White","face_1":8.24}}}}  按色档
 *   {"S~3XL":{"face_1":10.64,"face_2":11.97}}                         整档一个价
 * 空白衣售价优先取该色档的 colorPrices，没有时取尺码档的 blankPrice。
 */
function buildGroupPriceRows(product: ErpProduct, group: ErpPricingGroup): TierPriceRow[] {
  const quote = (product.suppliers ?? []).find((s) => s.id === group.supplierQuoteId);
  const crafts = (group.rules ?? []).map((rule) => ({
    craftName: rule.craftName,
    tiers: parseRecord(rule.printPriceJson) ?? {},
  }));
  const pricingTiers = new Map((group.pricingTiers ?? []).map((tier) => [tier.tierCode, tier]));
  const tierCodes = new Set([...pricingTiers.keys(), ...crafts.flatMap((c) => Object.keys(c.tiers))]);

  const rows: TierPriceRow[] = [];
  for (const tierCode of tierCodes) {
    const pricingTier = pricingTiers.get(tierCode);
    const quoteTier = quote?.sizeTiers?.find((tier) => tier.code === tierCode);
    const printTiers = crafts.map((c) => ({ craftName: c.craftName, tier: c.tiers[tierCode] }));

    const colorTierIds = new Set<string>(Object.keys(pricingTier?.colorPrices ?? {}));
    for (const { tier } of printTiers) {
      if (isRecord(tier) && isRecord(tier.colorTiers)) {
        for (const id of Object.keys(tier.colorTiers)) colorTierIds.add(id);
      }
    }

    for (const colorTierId of colorTierIds.size > 0 ? colorTierIds : [null]) {
      const quoteColorTier = quoteTier?.colorTiers?.find((c) => c.id === colorTierId);
      let colorTier = quoteColorTier?.code ?? null;
      const prints: CraftPrintPrice[] = [];
      for (const { craftName, tier } of printTiers) {
        if (!isRecord(tier)) continue;
        const source = isRecord(tier.colorTiers)
          ? (colorTierId ? tier.colorTiers[colorTierId] : undefined)
          : tier;
        if (!isRecord(source)) continue;
        if (typeof source.code === 'string') colorTier ??= source.code;
        const faces = readFaces(source);
        if (faces.length > 0) prints.push({ craftName, faces });
      }

      const colorBlankPrice = colorTierId ? pricingTier?.colorPrices?.[colorTierId] : undefined;
      rows.push({
        sizeTier: tierCode,
        sizes: pricingTier?.memberSizes ?? quoteTier?.memberSizes ?? [],
        colorTier,
        colors: quoteColorTier?.memberColors ?? [],
        blankPrice: isPrice(colorBlankPrice)
          ? colorBlankPrice
          : isPrice(pricingTier?.blankPrice) ? pricingTier.blankPrice : null,
        prints,
      });
    }
  }
  return rows;
}

/** 该等级下带印花报价的定价组，各自展开成价格明细。 */
function resolveGroupPriceRows(product: ErpProduct, tier: SellerTier): TierPriceRow[][] {
  const levelName = TIER_TO_ERP_LEVEL_NAME[tier];
  return (product.pricingGroups ?? [])
    .filter((g) => g.name === levelName && (g.rules?.length ?? 0) > 0)
    .map((g) => buildGroupPriceRows(product, g));
}

function parseRecord(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** 读取 face_1、face_2… 各面数的印花售价，按面数升序。 */
function readFaces(source: Record<string, unknown>): PrintFacePrice[] {
  const faces: PrintFacePrice[] = [];
  for (const [key, value] of Object.entries(source)) {
    const match = /^face_(\d+)$/.exec(key);
    if (match && isPrice(value)) faces.push({ faces: Number(match[1]), price: value });
  }
  return faces.sort((a, b) => a.faces - b.faces);
}

/** 选品展示的基准印花价：取单面；没有单面价时取最便宜的面数。 */
function pickBaseFace(faces: PrintFacePrice[]): PrintFacePrice {
  return faces.find((f) => f.faces === 1) ?? faces.reduce((a, b) => (b.price < a.price ? b : a));
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
  // 展示价 = 空白衣售价 + 基准印花价，逐「尺码档 × 色档 × 工艺」取候选。
  const prices: number[] = [];
  for (const rows of resolveGroupPriceRows(product, tier)) {
    for (const row of rows) {
      for (const craft of row.prints) {
        const price = (row.blankPrice ?? 0) + pickBaseFace(craft.faces).price;
        if (isPrice(price)) prices.push(price);
      }
    }
  }

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

/**
 * 详情页的价格明细：每个定价组一张表，按「尺码档 × 色档」列出空白衣售价和各工艺印花售价。
 * 只保留传入的 SKU（通常是可上架的 SKU）覆盖到的档位、尺码和颜色。
 */
export function resolveTierPriceTables(
  product: ErpProduct,
  tier: SellerTier,
  skus: ErpSku[] = product.prodSkuList ?? []
): TierPriceRow[][] {
  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;

  return resolveGroupPriceRows(product, tier)
    .map((rows) =>
      rows.flatMap((row) => {
        if (row.prints.length === 0 && row.blankPrice == null) return [];
        // 档位没有列出成员（sizes / colors 为空）时不按该维度筛选。
        const covered = skus.filter(
          (sku) =>
            (!sizeKey || row.sizes.length === 0 || row.sizes.includes(sku[sizeKey] ?? '')) &&
            (!colorKey || row.colors.length === 0 || row.colors.includes(sku[colorKey] ?? ''))
        );
        if (covered.length === 0) return [];
        return [{
          ...row,
          sizes: sizeKey ? row.sizes.filter((size) => covered.some((sku) => sku[sizeKey] === size)) : row.sizes,
          colors: colorKey ? row.colors.filter((color) => covered.some((sku) => sku[colorKey] === color)) : row.colors,
        }];
      })
    )
    .filter((rows) => rows.length > 0);
}
