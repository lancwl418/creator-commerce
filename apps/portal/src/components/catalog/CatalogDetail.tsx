'use client';

import Link from 'next/link';
import type { ErpProduct } from '@/lib/types/catalog';
import { getProductName } from '@/lib/catalog/product';
import { useCatalogDetail } from '@/hooks/catalog/useCatalogDetail';
import CatalogGallery from './CatalogGallery';
import CatalogProductInformation from './CatalogProductInformation';

export default function CatalogDetail({ product }: { product: ErpProduct }) {
  const detail = useCatalogDetail(product);
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard/catalog" className="hover:text-primary-600 transition-colors">
          Product Catalog
        </Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium truncate max-w-xs">
          {product.itemEnName || product.title || product.itemCnName}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CatalogGallery name={getProductName(product)} activeImage={detail.activeImage} setActiveImage={detail.setActiveImage} images={detail.images} />

        <CatalogProductInformation product={product} detail={detail} />
      </div>
    </div>
  );
}
