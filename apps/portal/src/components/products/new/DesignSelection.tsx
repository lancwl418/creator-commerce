import Link from 'next/link';
import Image from 'next/image';
import type { DesignForProduct } from '@/lib/types/product-creation';
import { getDesignArtworkUrl } from '@/lib/products/externalProducts';

interface DesignSelectionProps {
  designs: DesignForProduct[];
  selectedDesign: DesignForProduct | null;
  onSelect: (design: DesignForProduct) => void;
}

export default function DesignSelection({ designs, selectedDesign, onSelect }: DesignSelectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Design</h3>
      {designs.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center bg-white">
          <p className="text-gray-500 mb-4">No designs available. Upload one first.</p>
          <Link
            href="/dashboard/designs/new"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Upload Design
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {designs.map((design) => {
            const artworkUrl = getDesignArtworkUrl(design);
            const isSelected = selectedDesign?.id === design.id;
            return (
              <button
                key={design.id}
                onClick={() => {
                  onSelect(design);
                }}
                className={`rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-border hover:border-gray-300 hover:shadow-md'
                  }`}
              >
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {artworkUrl ? (
                    <Image unoptimized width={320} height={320} src={artworkUrl} alt={design.title} className="w-full h-full object-contain p-4" />
                  ) : (
                    <span className="text-gray-400 text-xs">No preview</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{design.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
