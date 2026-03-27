import { NextRequest, NextResponse } from 'next/server';
import { handleCorsOptions, jsonWithCors } from '@/lib/cors';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-01';

function parseLinkHeader(linkHeader: string | null): { next: string | null; prev: string | null } {
  const result = { next: null as string | null, prev: null as string | null };
  if (!linkHeader) return result;

  for (const part of linkHeader.split(',')) {
    const match = part.match(/page_info=([^>&]+).*rel="(next|previous)"/);
    if (match) {
      if (match[2] === 'next') result.next = match[1];
      if (match[2] === 'previous') result.prev = match[1];
    }
  }
  return result;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    return jsonWithCors(
      { error: 'Shopify credentials not configured' },
      request,
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '10';
  const pageInfo = searchParams.get('page_info');

  const url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/products.json`);
  if (pageInfo) {
    url.searchParams.set('page_info', pageInfo);
    url.searchParams.set('limit', limit);
  } else {
    url.searchParams.set('limit', limit);
    url.searchParams.set('status', 'active');
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Shopify API returned ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const links = parseLinkHeader(res.headers.get('link'));

    return jsonWithCors({
      products: data.products,
      nextPageInfo: links.next,
      prevPageInfo: links.prev,
    }, request);
  } catch (err) {
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}
