'use client';

import { useCallback, useRef } from 'react';
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
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const switchingRef = useRef(false);

  const handleSwitchProduct = useCallback(
    (index: number) => {
      if (index === activeIndex || switchingRef.current) return;
      switchingRef.current = true;

      // 1. Save current product — capture design state from store
      const currentDesign = structuredClone(useDesignStore.getState().design);

      // Try to capture thumbnail (may fail due to CORS)
      let thumbnail: string | undefined;
      try {
        const canvasEl = document.querySelector('.lower-canvas') as HTMLCanvasElement;
        if (canvasEl) {
          thumbnail = canvasEl.toDataURL('image/png', 0.3);
        }
      } catch {
        // CORS — use mockup as fallback (already set in ProductCard)
      }

      saveCurrentProduct(currentDesign, thumbnail);

      // 2. Update active index
      setActiveProduct(index);

      // 3. Read the target product AFTER saving (to get latest state)
      const target = useMultiProductStore.getState().products[index];
      if (!target) {
        switchingRef.current = false;
        return;
      }

      // 4. Ensure template is in the product store
      const allTemplates = useProductStore.getState().templates;
      if (!allTemplates.find((t) => t.id === target.template.id)) {
        useProductStore.getState().appendTemplates([target.template]);
      }

      // 5. Load target design into designStore FIRST (synchronous Zustand update)
      // This ensures the design is ready before useCanvas effect reads it
      const targetDesign = structuredClone(target.design);
      loadDesign(targetDesign);

      // 6. Select template — triggers useCanvas re-init
      // Called synchronously after loadDesign so the design is already in the store
      // when the canvas effect fires. _reinitToken ensures the effect runs even
      // when switching between products that share the same template.
      selectTemplate(target.template.id);
      switchingRef.current = false;
    },
    [activeIndex, saveCurrentProduct, setActiveProduct, selectTemplate, loadDesign]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (products.length <= 1) return;

      // Save current first if removing active
      if (index === activeIndex) {
        const currentDesign = structuredClone(useDesignStore.getState().design);
        saveCurrentProduct(currentDesign);
      }

      removeProduct(index);

      // Load new active product
      const newState = useMultiProductStore.getState();
      const newActive = newState.products[newState.activeIndex];
      if (newActive) {
        const allTemplates = useProductStore.getState().templates;
        if (!allTemplates.find((t) => t.id === newActive.template.id)) {
          useProductStore.getState().appendTemplates([newActive.template]);
        }
        loadDesign(structuredClone(newActive.design));
        selectTemplate(newActive.template.id);
      }
    },
    [products.length, activeIndex, removeProduct, selectTemplate, loadDesign, saveCurrentProduct]
  );

  const handleApplyToAll = useCallback(() => {
    const currentDesign = structuredClone(useDesignStore.getState().design);
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
  // Always show mockup image — canvas thumbnails often fail due to CORS
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
      {/* Always show product mockup image */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center">
        {mockupUrl ? (
          <img
            src={mockupUrl}
            alt={entry.template.name}
            className="w-full h-full object-contain p-2"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-xs text-center px-1">{entry.template.name}</span>
          </div>
        )}

        {/* Overlay indicator if design has layers */}
        {Object.values(entry.design.views).some((v) => v.layers?.length > 0) && (
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
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
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-opacity"
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
