import type { ErpProduct, ErpProductImage } from '@/types/erp-product';
import type { ProductTemplate, ProductView } from '@/types/product';
import { resolveErpImageUrl } from '@/lib/erpImageUrl';

const DEFAULT_MOCKUP_WIDTH = 800;
const DEFAULT_MOCKUP_HEIGHT = 1000;
const DEFAULT_PHYSICAL_WIDTH = 10;
const DEFAULT_PHYSICAL_HEIGHT = 12;
const DEFAULT_MIN_DPI = 150;
const PRINTABLE_AREA_RATIO = 0.6;

export function convertErpProduct(product: ErpProduct): ProductTemplate | null {
  // If ERP operators have already configured a print template via the embed
  // tool, use it verbatim — this is the source of truth for mockups and
  // printable areas. Falls through to the default-image flow only when not set.
  if (product.printTemplate?.views?.length) {
    const pt = product.printTemplate;
    return {
      id: `erp-${product.id}`,
      type: product.productType || 'erp',
      name: product.itemCnName || product.title,
      description: product.description || '',
      views: pt.views,
      defaultViewId: pt.views[0].id,
      metadata: {
        source: 'erp',
        erpProductId: product.id,
        itemNo: product.itemNo,
        price: product.prodSkuList?.[0]?.price ?? null,
        vendor: product.vendor,
        productRects: pt.productRects,
      },
    };
  }

  let imageList: ErpProductImage[] = product.prodImageList ?? [];

  // Fallback to mainPic if no image list
  if (imageList.length === 0 && product.mainPic) {
    imageList = [
      {
        id: 'main',
        picSrc: product.mainPic,
        isMain: 1,
        position: 0,
        altText: '',
        itemNo: product.itemNo,
      },
    ];
  }

  if (imageList.length === 0) return null;

  const paWidth = Math.round(DEFAULT_MOCKUP_WIDTH * PRINTABLE_AREA_RATIO);
  const paHeight = Math.round(DEFAULT_MOCKUP_HEIGHT * PRINTABLE_AREA_RATIO);
  const paX = Math.round((DEFAULT_MOCKUP_WIDTH - paWidth) / 2);
  const paY = Math.round((DEFAULT_MOCKUP_HEIGHT - paHeight) / 2);

  const views: ProductView[] = imageList.map((img, index) => ({
    id: `erp-${product.id}-img-${img.id}`,
    label: img.isMain ? 'Main' : `Image ${index + 1}`,
    mockupImageUrl: resolveErpImageUrl(img.picSrc),
    mockupWidth: DEFAULT_MOCKUP_WIDTH,
    mockupHeight: DEFAULT_MOCKUP_HEIGHT,
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
  }));

  return {
    id: `erp-${product.id}`,
    type: product.productType || 'erp',
    name: product.itemCnName || product.title,
    description: product.description || '',
    views,
    defaultViewId: views[0].id,
    metadata: {
      source: 'erp',
      erpProductId: product.id,
      itemNo: product.itemNo,
      price: product.prodSkuList?.[0]?.price ?? null,
      vendor: product.vendor,
    },
  };
}

export function convertErpProducts(products: ErpProduct[]): ProductTemplate[] {
  return products
    .map(convertErpProduct)
    .filter((t): t is ProductTemplate => t !== null);
}
