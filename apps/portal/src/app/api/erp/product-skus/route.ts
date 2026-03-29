import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ERP_BASE_URL = process.env.ERP_API_BASE_URL ?? 'http://118.195.245.201:8081/ideamax';
const ERP_API_URL = `${ERP_BASE_URL}/openapi/call/K5iOWd6y`;
const APP_KEY = process.env.ERP_APP_KEY ?? 'ak-OwVVN4U4gJINJ4nK';
const SECRET_KEY = process.env.ERP_SECRET_KEY ?? 'QSd7yhGrQ1YyPIFJ9LJXHAbOU67C1A7K';

/**
 * GET /api/erp/product-skus?erp_product_id=xxx
 *
 * Fetches SKU variants for a specific ERP product.
 * Since ERP only has a list API, we fetch all and filter by ID.
 */
export async function GET(request: NextRequest) {
  const erpProductId = request.nextUrl.searchParams.get('erp_product_id');
  if (!erpProductId) {
    return NextResponse.json({ error: 'Missing erp_product_id' }, { status: 400 });
  }

  const timestamp = String(Date.now());
  const signature = crypto
    .createHash('md5')
    .update(APP_KEY + SECRET_KEY + timestamp)
    .digest('hex');

  try {
    // Fetch all products (paginate with large page to find the one we need)
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
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ERP API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (!data.success || !data.result?.records) {
      return NextResponse.json(
        { error: 'ERP API returned no data' },
        { status: 502 }
      );
    }

    // Find the product by ID
    const product = data.result.records.find(
      (p: { id: string }) => p.id === erpProductId
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found in ERP' },
        { status: 404 }
      );
    }

    // Extract SKU variants with their options
    const skus = (product.prodSkuList || []).map((sku: {
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

    return NextResponse.json({
      product_id: product.id,
      name: product.itemCnName || product.title,
      skus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ERP data' },
      { status: 500 }
    );
  }
}
