import type { ErpProduct, ErpProductPage } from '@creator-commerce/shared/erp/types';
export type { ErpProduct, ErpProductPage } from '@creator-commerce/shared/erp/types';

export interface CatalogState extends ErpProductPage {
  loading: boolean;
  error: string;
}

export interface CatalogDetailPageProps {
  params: Promise<{ id: string }>;
}

export interface ErpProductsResponse {
  success: boolean;
  result?: Partial<ErpProductPage> & { list?: ErpProduct[] };
  error?: string;
  message?: string;
}

export interface DesignPoolItem {
  id: string;
  name: string;
  thumbnail: string | null;
}
