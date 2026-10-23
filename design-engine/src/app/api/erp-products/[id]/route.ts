import { NextRequest } from 'next/server';
import { ErpApiError, erpConfigFromEnv, findProductById } from '@creator-commerce/shared/erp';
import { handleCorsOptions, jsonWithCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await findProductById(erpConfigFromEnv(), id);
    if (!product) {
      return jsonWithCors(
        { success: false, error: `Product ${id} not found` },
        request,
        { status: 404 }
      );
    }
    return jsonWithCors({ success: true, result: product }, request);
  } catch (err) {
    return jsonWithCors(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      request,
      { status: err instanceof ErpApiError ? err.status : 500 }
    );
  }
}
