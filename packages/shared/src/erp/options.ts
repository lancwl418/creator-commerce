import type { ErpProduct } from './types';

export type SkuOptionKey = 'option1' | 'option2' | 'option3';

const SKU_OPTION_KEYS: SkuOptionKey[] = ['option1', 'option2', 'option3'];

export interface OptionDimension {
  /** 该维度的值存在 SKU 的哪个字段 */
  key: SkuOptionKey;
  name: string;
  isSize: boolean;
  isColor: boolean;
}

/**
 * 产品的变体维度，以及每个维度的值在 SKU 上的字段位置。
 *
 * 以 options[] 的顺序为准：options[i] 对应 SKU 的 option{i+1}。主档的 option1~3
 * 名称可能为空，也可能与 SKU 的顺序不一致，只在没有 options[] 时兜底。
 */
export function resolveOptionDimensions(product: ErpProduct): OptionDimension[] {
  const options = product.options ?? [];
  if (options.length > 0) {
    return options.slice(0, SKU_OPTION_KEYS.length).map((option, index) => ({
      key: SKU_OPTION_KEYS[index],
      name: option.dimensionName || option.dimensionCode,
      isSize: option.isSize === true,
      isColor: option.isColor === true,
    }));
  }

  return SKU_OPTION_KEYS.flatMap((key) => {
    const name = product[key] || product[`${key}Name`];
    if (!name) return [];
    const normalized = name.trim().toLowerCase();
    return [{ key, name, isSize: normalized === 'size', isColor: normalized === 'color' }];
  });
}
