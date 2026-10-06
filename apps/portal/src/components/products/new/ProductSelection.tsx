import Image from 'next/image';
import type { ExternalProduct, ProductSourceFilter } from '@/lib/types/product-creation';

interface ProductSelectionProps {
  products: ExternalProduct[];
  selectedProducts: ExternalProduct[];
  productsLoading: boolean;
  activeTab: ProductSourceFilter;
  setActiveTab: (tab: ProductSourceFilter) => void;
  toggleProduct: (product: ExternalProduct) => void;
  onBack: () => void;
  handleOpenEditor: () => void;
}

export default function ProductSelection({ products, selectedProducts, productsLoading, activeTab, setActiveTab, toggleProduct, onBack, handleOpenEditor }: ProductSelectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Select Products</h3>
        {selectedProducts.length > 0 && (
          <span className="text-sm text-gray-500">
            {selectedProducts.length} selected
          </span>
        )}
      </div>

      {/* Source tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'shopify' as const, label: 'Shopify' },
          { key: 'erp' as const, label: 'ERP' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {productsLoading ? (
        <div className="text-center py-12 text-gray-500">Loading products from Shopify & ERP...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No products found. Check Design Engine connection.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products
            .filter((p) => activeTab === 'all' || p.source === activeTab)
            .map((product) => {
              const isSelected = selectedProducts.some((s) => s.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product)}
                  className={`relative rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${isSelected
                    ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                  {/* Checkbox */}
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 ${isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white/80 border-gray-300'
                    }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>

                  {/* Source badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${product.source === 'shopify'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {product.source}
                    </span>
                  </div>

                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {product.thumbnail ? (
                      <Image unoptimized width={320} height={320}
                        src={product.thumbnail}
                        alt={product.name}
                        className="w-full h-full object-contain p-3"
                      />
                    ) : (
                      <span className="text-gray-300 text-xs">No image</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{product.base_cost == null ? 'Price unavailable' : `$${product.base_cost.toFixed(2)}`}</p>
                  </div>
                </button>
              );
            })}
        </div>
      )}

      <div className="flex items-center justify-between mt-5">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors"
        >
          &larr; Back
        </button>
        {selectedProducts.length > 0 && (
          <button
            onClick={handleOpenEditor}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Open Editor ({selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''})
          </button>
        )}
      </div>
    </div>
  );
}
