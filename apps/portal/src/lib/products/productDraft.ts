import type { ProductData, ProductDraftInput, SkuSelection } from '@/lib/types/product';

/** 构造保存数据与校验规则，编辑器和发布前保存共用。 */
export function buildProductDraftUpdate(product: ProductData, input: ProductDraftInput) {
  if (!Number.isFinite(input.retailPrice) || input.retailPrice <= 0) {
    throw new Error('Please enter a valid price');
  }
  if (input.enabledSkuIds.size === 0) throw new Error('Please select at least one variant');

  const selectedSkus: SkuSelection[] = input.erpSkus.map((sku) => ({
    sku_id: sku.id,
    sku: sku.sku,
    option1: sku.option1,
    option2: sku.option2,
    option3: sku.option3,
    enabled: input.enabledSkuIds.has(sku.id),
    price: input.variantPrices[sku.id] !== undefined && input.variantPrices[sku.id] !== ''
      ? (parseFloat(input.variantPrices[sku.id]) || null) : null,
    erpPrice: sku.price ?? null,
    skuImage: sku.skuImage || null,
  }));

  return {
    title: input.title.trim() || product.title,
    description: input.description.trim(),
    selected_skus: selectedSkus,
    option_names: input.optionNames,
    retail_price: input.retailPrice,
    ...(input.costMin != null ? { cost: input.costMin } : {}),
    product_images: product.product_images.filter((image) => input.selectedImageIds.has(image.id)),
    shipping_cost: input.shippingCost,
    tags: input.tags,
    status: product.status === 'draft' ? 'ready' : product.status,
  };
}
