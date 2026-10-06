import { NextResponse } from 'next/server';
import { ErpApiError } from '@creator-commerce/shared/erp';
import { getCatalogProduct } from '@/lib/queries/catalog';
import type { CatalogDetailPageProps } from '@/lib/types/catalog';

export async function GET(_request: Request, { params }: CatalogDetailPageProps) {
  try {
    const { id } = await params;
    const product = await getCatalogProduct(id);
    return product
      ? NextResponse.json({ product })
      : NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load product' },
      { status: error instanceof ErpApiError ? error.status : 500 },
    );
  }
}
