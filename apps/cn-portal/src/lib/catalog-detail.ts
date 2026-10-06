import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { resolveOptionDimensions } from '@creator-commerce/shared/erp/options';
import { type SellerTier, type TierPriceRow, resolveTierPriceTables } from '@creator-commerce/shared/erp/pricing';
import type {
  CatalogItem, PlatformData, PriceTableColumn, PriceTableView, ProductAttribute, ProductDetailView,
} from './types/catalog';
import { getListableSkus } from './catalog';

function distinct(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

const LIST_SEPARATOR = ' / ';

/** 把一个定价方案的档位明细整理成表格：列为各工艺 × 面数，行为各「尺码档 × 色档」。 */
export function buildPriceTableView(rows: TierPriceRow[]): PriceTableView {
  const columns: PriceTableColumn[] = [];
  for (const row of rows) {
    for (const craft of row.prints) {
      for (const face of craft.faces) {
        if (!columns.some((c) => c.craftName === craft.craftName && c.faces === face.faces)) {
          columns.push({ craftName: craft.craftName, faces: face.faces });
        }
      }
    }
  }
  // 同一工艺的列相邻，面数升序；工艺之间保持首次出现的顺序。
  const craftOrder = [...new Set(columns.map((c) => c.craftName))];
  columns.sort((a, b) =>
    craftOrder.indexOf(a.craftName) - craftOrder.indexOf(b.craftName) || a.faces - b.faces
  );

  return {
    // 所有档位都没有空白衣售价（未报价或为 0）时不显示这一列。
    showBlankPrice: rows.some((row) => row.blankPrice != null && row.blankPrice > 0),
    columns,
    rows: rows.map((row) => ({
      sizes: row.sizes.join(LIST_SEPARATOR) || row.sizeTier,
      colors: row.colors.join(LIST_SEPARATOR) || row.colorTier,
      blankPrice: row.blankPrice,
      printPrices: columns.map((column) =>
        row.prints
          .find((craft) => craft.craftName === column.craftName)
          ?.faces.find((face) => face.faces === column.faces)?.price ?? null
      ),
    })),
  };
}

export function buildProductDetailView(
  product: ErpProduct,
  item: CatalogItem,
  data: PlatformData,
  tier: SellerTier
): ProductDetailView {
  const skus = getListableSkus(product, data);
  // 图集
  const images = distinct([
    product.mainPic,
    ...(product.prodImageList ?? []).map((i) => i.picSrc),
  ]);

  // 属性表（英文原文，文档 5.3）：每个变体维度一行，值取可上架 SKU 并去重。
  const attrs: ProductAttribute[] = [];
  for (const dimension of resolveOptionDimensions(product)) {
    const value = distinct(skus.map((s) => s[dimension.key])).join(', ');
    if (value) attrs.push({ label: dimension.name, value });
  }
  if (product.weight != null)
    attrs.push({ label: 'Weight', value: String(product.weight) });

  return {
    item,
    images,
    attributes: attrs,
    priceTables: resolveTierPriceTables(product, tier, skus).map(buildPriceTableView),
    productionTime: product.productionTime ?? null,
    shipFrom: product.shipFrom ?? null,
  };
}
