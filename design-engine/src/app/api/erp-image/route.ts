import { proxyErpImage } from '@creator-commerce/shared/erp';

export async function GET(request: Request) {
  return proxyErpImage(request, { 'Access-Control-Allow-Origin': '*' });
}
