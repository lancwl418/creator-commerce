'use client';

import type { ProductImage } from '@/lib/types';
import { resolveErpImageUrl } from '@/lib/utils';

interface ProductImagesSelectorProps {
  images: ProductImage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export default function ProductImagesSelector({ images, selectedIds, onToggle }: ProductImagesSelectorProps) {
  if (images.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product Images</h3>
        <span className="text-xs text-gray-400">{selectedIds.size}/{images.length} selected for sync</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {images.map((img) => {
          const selected = selectedIds.has(img.id);
          return (
            <button
              key={img.id}
              onClick={() => onToggle(img.id)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                selected ? 'border-primary-500 shadow-sm' : 'border-transparent opacity-50'
              }`}
            >
              <div className="aspect-square bg-gray-50">
                <img src={resolveErpImageUrl(img.url)} alt="" className="w-full h-full object-contain p-1" />
              </div>
              <div className={`absolute top-1 right-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                selected ? 'bg-primary-600 border-primary-600' : 'bg-white/80 border-gray-300'
              }`}>
                {selected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
              {img.isMain && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 rounded">MAIN</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
