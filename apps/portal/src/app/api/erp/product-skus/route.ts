import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ERP config
const ERP_BASE_URL = process.env.ERP_API_BASE_URL ?? 'http://118.195.245.201:8081/ideamax';
const ERP_API_URL = `${ERP_BASE_URL}/openapi/call/K5iOWd6y`;
const APP_KEY = process.env.ERP_APP_KEY ?? 'ak-OwVVN4U4gJINJ4nK';
const SECRET_KEY = process.env.ERP_SECRET_KEY ?? 'QSd7yhGrQ1YyPIFJ9LJXHAbOU67C1A7K';

// Shopify config
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? '';
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? '';
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-01';

interface SkuResult {
  id: string;
  sku: string;
  price: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inQty: number;
  skuImage: string | null;
}

/**
 * GET /api/erp/product-skus?template_id=shopify-123 or erp-456
 *
 * Fetches SKU variants for a product. Supports both Shopify and ERP sources.
 */
export async function GET(request: NextRequest) {
  const templateId = request.nextUrl.searchParams.get('template_id')
    || request.nextUrl.searchParams.get('erp_product_id');

  if (!templateId) {
    return NextResponse.json({ error: 'Missing template_id' }, { status: 400 });
  }

  try {
    if (templateId.startsWith('shopify-')) {
      return await fetchShopifySkus(templateId.slice(8));
    } else if (templateId.startsWith('erp-')) {
      return await fetchErpSkus(templateId.slice(4));
    } else {
      // Try ERP by default
      return await fetchErpSkus(templateId);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch SKU data' },
      { status: 500 }
    );
  }
}

async function fetchShopifySkus(shopifyProductId: string): Promise<NextResponse> {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${shopifyProductId}.json`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Shopify API returned ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const product = data.product;

  if (!product) {
    return NextResponse.json({ error: 'Product not found in Shopify' }, { status: 404 });
  }

  // Extract option names (e.g., "Size", "Color")
  const optionNames = (product.options || []).map((o: { name: string }) => o.name);

  const skus: SkuResult[] = (product.variants || []).map((v: {
    id: number;
    sku: string;
    price: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    inventory_quantity: number;
    image_id: number | null;
  }) => ({
    id: String(v.id),
    sku: v.sku || `${v.option1 || ''}${v.option2 ? '-' + v.option2 : ''}`,
    price: parseFloat(v.price) || 0,
    option1: v.option1 || null,
    option2: v.option2 || null,
    option3: v.option3 || null,
    inQty: v.inventory_quantity ?? 0,
    skuImage: null,
  }));

  return NextResponse.json({
    product_id: String(product.id),
    name: product.title,
    source: 'shopify',
    option_names: optionNames,
    skus,
  });
}

async function fetchErpSkus(erpProductId: string): Promise<NextResponse> {
  const timestamp = String(Date.now());
  const signature = crypto
    .createHash('md5')
    .update(APP_KEY + SECRET_KEY + timestamp)
    .digest('hex');

  const url = new URL(ERP_API_URL);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('pageSize', '100');

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      appkey: APP_KEY,
      signature,
      timestamp,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `ERP API returned ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  if (!data.success || !data.result?.records) {
    return NextResponse.json({ error: 'ERP API returned no data' }, { status: 502 });
  }

  const product = data.result.records.find(
    (p: { id: string }) => p.id === erpProductId
  );

  if (!product) {
    return NextResponse.json({ error: 'Product not found in ERP' }, { status: 404 });
  }

  const skus: SkuResult[] = (product.prodSkuList || []).map((sku: {
    id: string;
    sku: string;
    price: number;
    option1: string;
    option2: string;
    option3: string;
    inQty: number;
    skuImage: string;
  }) => ({
    id: sku.id,
    sku: sku.sku,
    price: sku.price,
    option1: sku.option1 || null,
    option2: sku.option2 || null,
    option3: sku.option3 || null,
    inQty: sku.inQty,
    skuImage: sku.skuImage || null,
  }));

  // Extract option names from ERP product (e.g. "Color", "Size", "material")
  const erpOptionNames: string[] = [];
  if (product.option1Name) erpOptionNames.push(product.option1Name);
  else if (skus.some((s: SkuResult) => s.option1)) erpOptionNames.push('Color');
  if (product.option2Name) erpOptionNames.push(product.option2Name);
  else if (skus.some((s: SkuResult) => s.option2)) erpOptionNames.push('Size');
  if (product.option3Name) erpOptionNames.push(product.option3Name);
  else if (skus.some((s: SkuResult) => s.option3)) erpOptionNames.push('Option 3');

  return NextResponse.json({
    product_id: product.id,
    name: product.itemCnName || product.title,
    source: 'erp',
    option_names: erpOptionNames,
    skus,
  });
}
