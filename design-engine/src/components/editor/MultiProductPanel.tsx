'use client';

import { useCallback } from 'react';
import { useMultiProductStore, type ProductEntry } from '@/stores/multiProductStore';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';

export default function MultiProductPanel() {
  const products = useMultiProductStore((s) => s.products);
  const activeIndex = useMultiProductStore((s) => s.activeIndex);
  const setActiveProduct = useMultiProductStore((s) => s.setActiveProduct);
  const saveCurrentProduct = useMultiProductStore((s) => s.saveCurrentProduct);
  const removeProduct = useMultiProductStore((s) => s.removeProduct);
  const applyToAll = useMultiProductStore((s) => s.applyToAll);
  const isMultiProduct = useMultiProductStore((s) => s.isMultiProduct);

  const selectTemplate = useProductStore((s) => s.selectTemplate);
  const design = useDesignStore((s) => s.design);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const initDesign = useDesignStore((s) => s.initDesign);

  const handleSwitchProduct = useCallback(
    (index: number) => {
      if (index === activeIndex) return;

      // 1. Save current product state
      const currentDesign = useDesignStore.getState().design;
      // Generate thumbnail from canvas
      let thumbnail: string | undefined;
      const canvas = document.querySelector('canvas.upper-canvas, canvas') as HTMLCanvasElement;
      if (canvas) {
        try {
          thumbnail = canvas.toDataURL('image/png', 0.3);
        } catch {
          // CORS or other error
        }
      }
      saveCurrentProduct(currentDesign, thumbnail);

      // 2. Switch to new product
      setActiveProduct(index);

      // 3. Load new product into stores
      const target = useMultiProductStore.getState().products[index];
      if (!target) return;

      // Set the template in productStore
      const templates = useProductStore.getState().templates;
      if (!templates.find((t) => t.id === target.template.id)) {
        useProductStore.getState().appendTemplates([target.template]);
      }
      selectTemplate(target.template.id);

      // Load the design
      if (target.design.views && Object.keys(target.design.views).length > 0) {
        loadDesign(target.design);
      } else {
        initDesign(
          target.template.id,
          target.template.views.map((v) => v.id)
        );
      }
    },
    [activeIndex, saveCurrentProduct, setActiveProduct, selectTemplate, loadDesign, initDesign]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (products.length <= 1) return;
      removeProduct(index);

      // If removing active, load the new active
      if (index === activeIndex) {
        const newState = useMultiProductStore.getState();
        const newActive = newState.products[newState.activeIndex];
        if (newActive) {
          const templates = useProductStore.getState().templates;
          if (!templates.find((t) => t.id === newActive.template.id)) {
            useProductStore.getState().appendTemplates([newActive.template]);
          }
          selectTemplate(newActive.template.id);
          loadDesign(newActive.design);
        }
      }
    },
    [products.length, activeIndex, removeProduct, selectTemplate, loadDesign]
  );

  const handleApplyToAll = useCallback(() => {
    // Save current first
    const currentDesign = useDesignStore.getState().design;
    saveCurrentProduct(currentDesign);
    applyToAll(activeIndex);
  }, [activeIndex, saveCurrentProduct, applyToAll]);

  if (!isMultiProduct || products.length === 0) return null;

  return (
    <div className="w-48 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Products ({products.length})
        </h3>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
        {products.map((entry, index) => (
          <ProductCard
            key={entry.template.id}
            entry={entry}
            index={index}
            isActive={index === activeIndex}
            canRemove={products.length > 1}
            onClick={() => handleSwitchProduct(index)}
            onRemove={(e) => handleRemove(e, index)}
          />
        ))}
      </div>

      {/* Actions */}
      {products.length > 1 && (
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleApplyToAll}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Apply to All
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  entry,
  index,
  isActive,
  canRemove,
  onClick,
  onRemove,
}: {
  entry: ProductEntry;
  index: number;
  isActive: boolean;
  canRemove: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const mockupUrl = entry.template.views[0]?.mockupImageUrl;
  const source = (entry.template.metadata?.source as string) || '';

  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-lg border-2 overflow-hidden text-left transition-all ${
        isActive
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Thumbnail / Mockup */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center">
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt={entry.template.name}
            className="w-full h-full object-contain"
          />
        ) : mockupUrl ? (
          <img
            src={mockupUrl}
            alt={entry.template.name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="text-gray-300 text-xs">{index + 1}</div>
        )}
      </div>

      {/* Label */}
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-medium text-gray-700 truncate">
          {entry.template.name}
        </p>
        {source && (
          <p className="text-[9px] text-gray-400 uppercase">{source}</p>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-500" />
      )}

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-opacity"
          style={{ opacity: isActive ? 0.7 : 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = isActive ? '0.7' : '0')}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </button>
  );
}
