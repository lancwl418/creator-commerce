import type { ShopifyProduct } from '@/types/shopify-product';
import type { ProductTemplate, ProductView } from '@/types/product';

const DEFAULT_PHYSICAL_WIDTH = 10;
const DEFAULT_PHYSICAL_HEIGHT = 12;
const DEFAULT_MIN_DPI = 150;
const PRINTABLE_AREA_RATIO = 0.6;
const MAX_MOCKUP_DIM = 1200;

function capDimensions(w: number, h: number): { width: number; height: number } {
  if (w <= MAX_MOCKUP_DIM && h <= MAX_MOCKUP_DIM) return { width: w, height: h };
  const ratio = Math.min(MAX_MOCKUP_DIM / w, MAX_MOCKUP_DIM / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

export function convertShopifyProduct(product: ShopifyProduct): ProductTemplate | null {
  if (!product.images || product.images.length === 0) return null;

  const views: ProductView[] = product.images.map((img, index) => {
    const { width: mockupWidth, height: mockupHeight } = capDimensions(
      img.width || 800,
      img.height || 1000
    );
    const paWidth = Math.round(mockupWidth * PRINTABLE_AREA_RATIO);
    const paHeight = Math.round(mockupHeight * PRINTABLE_AREA_RATIO);
    const paX = Math.round((mockupWidth - paWidth) / 2);
    const paY = Math.round((mockupHeight - paHeight) / 2);

    return {
      id: `shopify-${product.id}-img-${img.id}`,
      label: index === 0 ? 'Main' : `Image ${index + 1}`,
      mockupImageUrl: img.src,
      mockupWidth,
      mockupHeight,
      printableArea: {
        shape: { type: 'rect' as const },
        x: paX,
        y: paY,
        width: paWidth,
        height: paHeight,
        physicalWidthInches: DEFAULT_PHYSICAL_WIDTH,
        physicalHeightInches: DEFAULT_PHYSICAL_HEIGHT,
        minDPI: DEFAULT_MIN_DPI,
      },
    };
  });

  return {
    id: `shopify-${product.id}`,
    type: product.product_type || 'shopify',
    name: product.title,
    description: '',
    views,
    defaultViewId: views[0].id,
    metadata: {
      source: 'shopify',
      shopifyProductId: product.id,
      price: product.variants[0]?.price ?? null,
      vendor: product.vendor,
    },
  };
}

export function convertShopifyProducts(products: ShopifyProduct[]): ProductTemplate[] {
  return products
    .map(convertShopifyProduct)
    .filter((t): t is ProductTemplate => t !== null);
}
