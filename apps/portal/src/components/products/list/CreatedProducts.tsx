import Link from 'next/link';
import type { ProductListItem } from '@/lib/types/product';
import { PRODUCT_TABS, productMatchesTab, countProductsByTab, type ProductTabKey } from '@/lib/products/productTabs';
import EmptyState from '@/components/ui/EmptyState';
import ProductTabs from './ProductTabs';
import ProductTable from './ProductTable';

interface CreatedProductsProps {
  products: ProductListItem[];
  activeTab: ProductTabKey;
}

export default function CreatedProducts({ products, activeTab }: CreatedProductsProps) {
  const counts = countProductsByTab(products);
  const visibleProducts = products.filter((product) => productMatchesTab(product.status, activeTab));
  const tabLabel = PRODUCT_TABS.find((tab) => tab.key === activeTab)?.label ?? '';
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Created Products</h2>
          <p className="text-gray-500 text-sm mt-1">Products you've created and their current status</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
        >
          Create Product
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState>
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">No products yet. Create one from your designs.</p>
          <Link
            href="/dashboard/products/new"
            className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Create Product
          </Link>
        </EmptyState>
      ) : (
        <>
          <ProductTabs activeTab={activeTab} counts={counts} />
          {visibleProducts.length === 0 ? (
            <EmptyState><p className="text-gray-500">No {tabLabel.toLowerCase()} products.</p></EmptyState>
          ) : <ProductTable products={visibleProducts} />}
        </>
      )}
    </div>
  );
}
