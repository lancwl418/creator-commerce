import Link from 'next/link';
import { PRODUCT_TABS, type ProductTabKey } from '@/lib/products/productTabs';

interface ProductTabsProps {
  activeTab: ProductTabKey;
  counts: Record<ProductTabKey, number>;
}

export default function ProductTabs({ activeTab, counts }: ProductTabsProps) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-border-light">
      {PRODUCT_TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link key={tab.key} href={`/dashboard/products?tab=${tab.key}`}
            className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'text-primary-700' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {tab.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              isActive ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}>{counts[tab.key]}</span>
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary-600" />}
          </Link>
        );
      })}
    </div>
  );
}
