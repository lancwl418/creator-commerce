import { NextRequest, NextResponse } from 'next/server';
import { takeCachedProducts } from '@/lib/products-cache';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Design Engine 取编辑用的产品数据（key 由设计页在服务端写入，只能读一次）。 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400, headers: CORS_HEADERS });
  const products = await takeCachedProducts(key);
  if (!products) return NextResponse.json({ error: 'Not found or expired' }, { status: 404, headers: CORS_HEADERS });
  return NextResponse.json({ products }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
