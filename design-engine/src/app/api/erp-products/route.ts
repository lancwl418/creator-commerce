import { NextRequest } from 'next/server';
import { ErpApiError, erpConfigFromEnv, fetchProductsEnvelope } from '@creator-commerce/shared/erp';
import { handleCorsOptions, jsonWithCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const data = await fetchProductsEnvelope(
      erpConfigFromEnv(),
      searchParams.get('pageNo') ?? '1',
      searchParams.get('pageSize') ?? '10'
    );
    return jsonWithCors(data, request);
  } catch (err) {
    return jsonWithCors(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      request,
      { status: err instanceof ErpApiError ? err.status : 500 }
    );
  }
}
