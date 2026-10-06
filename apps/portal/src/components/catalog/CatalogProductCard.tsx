import Image from 'next/image';
import Link from 'next/link';
import type { ErpProduct } from '@/lib/types/catalog';
import { getCategory, getImageUrl, getPriceRange } from '@/lib/catalog/product';

interface CatalogProductCardProps {
  product: ErpProduct;
  isSelected: boolean;
  busy: boolean;
  toggleSelect: (id: string) => void;
  handleDesignSingle: (product: ErpProduct) => void;
}

export default function CatalogProductCard({ product, isSelected, busy, toggleSelect, handleDesignSingle }: CatalogProductCardProps) {
  const imgUrl = getImageUrl(product);
  const price = getPriceRange(product)?.min;
  const skuCount = product.prodSkuList?.length ?? 0;
  return (
    <div
      className={`group relative rounded-2xl border-2 bg-white overflow-hidden transition-all hover:-translate-y-0.5 ${isSelected
        ? 'border-primary-500 shadow-lg shadow-primary-500/10'
        : 'border-border hover:border-gray-200 hover:shadow-md'
        }`}
    >
      {/* Checkbox — click stops propagation, only toggles selection */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSelect(product.id);
        }}
        className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 transition-all cursor-pointer ${isSelected
          ? 'bg-primary-600 border-primary-600'
          : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
          }`}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Design button — overlay on hover, single-product wizard */}
      <button
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDesignSingle(product);
        }}
        className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-10 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-800"
      >
        Design
      </button>

      {/* Card body — click navigates to detail */}
      <Link href={`/dashboard/catalog/${product.id}`} className="block text-left">
        {/* Image */}
        <div className="aspect-square bg-surface-secondary flex items-center justify-center">
          {imgUrl ? (
            <Image unoptimized width={400} height={400}
              src={imgUrl}
              alt={product.itemEnName || product.title}
              className="w-full h-full object-contain p-4"
              loading="lazy"
            />
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
            {product.itemEnName || product.title || product.itemCnName}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {product.itemNo}
          </p>
          <div className="flex items-center justify-between mt-2">
            {price != null && (
              <span className="text-xs font-semibold text-gray-700">
                ${Number(price).toFixed(2)}
              </span>
            )}
            {skuCount > 0 && (
              <span className="text-[10px] text-gray-400">
                {skuCount} variant{skuCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {getCategory(product) && (
            <span className="inline-block mt-2 rounded-md bg-surface-secondary px-2 py-0.5 text-[10px] text-gray-500 font-medium">
              {getCategory(product)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
