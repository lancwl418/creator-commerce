import type { ErpProduct } from '@/lib/types/catalog';
import type { useCatalogDetail } from '@/hooks/catalog/useCatalogDetail';
import { getCategory } from '@/lib/catalog/product';
import CatalogDetailActions from './CatalogDetailActions';

interface CatalogProductInformationProps {
  product: ErpProduct;
  detail: ReturnType<typeof useCatalogDetail>;
}

export default function CatalogProductInformation({ product, detail }: CatalogProductInformationProps) {
  const { priceRange, rawOptions, colorValues, sizeValues, selectedColor, selectedSize, handleColorSelect, setSelectedSize } = detail;
  return (
    <div className="space-y-5">
      {/* Title & meta */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {product.itemEnName || product.title || product.itemCnName}
        </h1>
        {product.itemCnName && product.itemEnName && (
          <p className="text-sm text-gray-400 mt-1">{product.itemCnName}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-gray-400 font-mono">{product.itemNo}</span>
          {getCategory(product) && (
            <span className="inline-block rounded-md bg-surface-secondary px-2.5 py-0.5 text-[11px] text-gray-500 font-medium">
              {getCategory(product)}
            </span>
          )}
          {product.vendor && (
            <span className="text-xs text-gray-400">{product.vendor}</span>
          )}
        </div>
      </div>

      {/* Price */}
      {priceRange && (
        <div className="rounded-xl bg-surface-secondary p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Base Cost</p>
          <p className="text-xl font-bold text-gray-900">
            {priceRange.min === priceRange.max
              ? `$${priceRange.min.toFixed(2)}`
              : `$${priceRange.min.toFixed(2)} – $${priceRange.max.toFixed(2)}`}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {product.prodSkuList.length} variant{product.prodSkuList.length > 1 ? 's' : ''} available
          </p>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Options / Variants */}
      {(colorValues.length > 0 || sizeValues.length > 0) && (
        <div className="space-y-3">
          {colorValues.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Color{selectedColor ? `: ${selectedColor}` : ''}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {colorValues.map((v) => (
                  <button
                    key={v}
                    onClick={() => handleColorSelect(v)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${selectedColor === v
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-border bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sizeValues.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size</h3>
              <div className="flex flex-wrap gap-1.5">
                {sizeValues.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedSize(v)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${selectedSize === v
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-border bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          {rawOptions && rawOptions.option3.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Option 3</h3>
              <div className="flex flex-wrap gap-1.5">
                {rawOptions.option3.map((v) => (
                  <span key={v} className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-gray-700 font-medium">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {product.tags && (
        <div className="flex flex-wrap gap-1.5">
          {product.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500 font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      <CatalogDetailActions addedToPool={detail.addedToPool} busy={detail.busy} error={detail.error} handleStartDesigning={detail.handleStartDesigning} handleAddToDesignPool={detail.handleAddToDesignPool} />
    </div>
  );
}
