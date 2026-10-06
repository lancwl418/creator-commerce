import { NextRequest, NextResponse } from 'next/server';
import { ErpApiError, erpConfigFromEnv, fetchProductsEnvelope } from '@creator-commerce/shared/erp';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const data = await fetchProductsEnvelope(
      erpConfigFromEnv(),
      searchParams.get('pageNo') ?? '1',
      searchParams.get('pageSize') ?? '20',
      { revalidate: 300 }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: err instanceof ErpApiError ? err.status : 500 }
    );
  }
}
