import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ERP_BASE_URL = process.env.ERP_API_BASE_URL ?? 'http://118.195.245.201:8081/ideamax';
const ERP_API_URL = `${ERP_BASE_URL}/openapi/call/K5iOWd6y`;
const APP_KEY = process.env.ERP_APP_KEY ?? 'ak-OwVVN4U4gJINJ4nK';
const SECRET_KEY = process.env.ERP_SECRET_KEY ?? 'QSd7yhGrQ1YyPIFJ9LJXHAbOU67C1A7K';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageNo = searchParams.get('pageNo') ?? '1';
  const pageSize = searchParams.get('pageSize') ?? '10';

  const timestamp = String(Date.now());
  const signature = crypto
    .createHash('md5')
    .update(APP_KEY + SECRET_KEY + timestamp)
    .digest('hex');

  const url = new URL(ERP_API_URL);
  url.searchParams.set('pageNo', pageNo);
  url.searchParams.set('pageSize', pageSize);

  try {
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
        { success: false, error: `ERP API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
