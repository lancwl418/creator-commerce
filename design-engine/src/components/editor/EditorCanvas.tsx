'use client';

import { useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEditorStore } from '@/stores/editorStore';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { calculateDpi } from '@/core/canvas/DpiCalculator';
import type { DesignLayer } from '@/types/design';

export default function EditorCanvas() {
  const { canvasRef, getManager } = useCanvas();
  const zoom = useEditorStore((s) => s.zoom);
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const design = useDesignStore((s) => s.design);

  useKeyboardShortcuts(getManager);

  // Listen for layer-added events from EditorPage
  useEffect(() => {
    const handler = (e: Event) => {
      const layer = (e as CustomEvent<DesignLayer>).detail;
      getManager()?.addLayer(layer);
    };
    window.addEventListener('ideamizer:layer-added', handler);
    return () => window.removeEventListener('ideamizer:layer-added', handler);
  }, [getManager]);

  // Listen for PNG export requests
  useEffect(() => {
    const handler = () => {
      const manager = getManager();
      if (!manager) return;
      const dataURL = manager.exportToDataURL('png', 2);
      if (dataURL) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'design.png';
        a.click();
      }
    };
    window.addEventListener('ideamizer:export-png', handler);
    return () => window.removeEventListener('ideamizer:export-png', handler);
  }, [getManager]);

  // Listen for layer reorder events
  useEffect(() => {
    const handler = (e: Event) => {
      const orderedIds = (e as CustomEvent<string[]>).detail;
      getManager()?.reorderLayers(orderedIds);
    };
    window.addEventListener('ideamizer:layers-reordered', handler);
    return () => window.removeEventListener('ideamizer:layers-reordered', handler);
  }, [getManager]);

  // Listen for layer transform updates (alignment)
  useEffect(() => {
    const handler = (e: Event) => {
      const { layerId, ...transform } = (e as CustomEvent).detail;
      getManager()?.updateLayerTransform(layerId, transform);
    };
    window.addEventListener('ideamizer:layer-transform', handler);
    return () => window.removeEventListener('ideamizer:layer-transform', handler);
  }, [getManager]);

  // Listen for layer flip events
  useEffect(() => {
    const handler = (e: Event) => {
      const { layerId, direction } = (e as CustomEvent).detail;
      if (direction === 'horizontal') {
        getManager()?.flipLayerHorizontal(layerId);
      } else {
        getManager()?.flipLayerVertical(layerId);
      }
    };
    window.addEventListener('ideamizer:layer-flip', handler);
    return () => window.removeEventListener('ideamizer:layer-flip', handler);
  }, [getManager]);

  // Listen for image source update (background removal)
  useEffect(() => {
    const handler = (e: Event) => {
      const { layerId, src } = (e as CustomEvent).detail;
      getManager()?.updateImageSource(layerId, src);
    };
    window.addEventListener('ideamizer:update-image-src', handler);
    return () => window.removeEventListener('ideamizer:update-image-src', handler);
  }, [getManager]);

  // Listen for crop events
  useEffect(() => {
    const enterHandler = (e: Event) => {
      const layerId = (e as CustomEvent<string>).detail;
      getManager()?.enterCropMode(layerId);
    };
    const applyHandler = () => {
      const result = getManager()?.applyCrop();
      if (result) {
        const viewId = useProductStore.getState().activeViewId;
        const layer = useDesignStore.getState().design.views[viewId]?.layers.find(
          (l) => l.id === result.layerId
        );
        if (layer && layer.data.type === 'image') {
          useDesignStore.getState().updateLayer(viewId, result.layerId, {
            data: {
              ...layer.data,
              cropX: result.cropX,
              cropY: result.cropY,
              cropWidth: result.cropWidth,
              cropHeight: result.cropHeight,
            },
          });
        }
      }
      useEditorStore.getState().setActiveTool('select');
    };
    const cancelHandler = () => {
      getManager()?.cancelCrop();
      useEditorStore.getState().setActiveTool('select');
    };
    window.addEventListener('ideamizer:enter-crop', enterHandler);
    window.addEventListener('ideamizer:apply-crop', applyHandler);
    window.addEventListener('ideamizer:cancel-crop', cancelHandler);
    return () => {
      window.removeEventListener('ideamizer:enter-crop', enterHandler);
      window.removeEventListener('ideamizer:apply-crop', applyHandler);
      window.removeEventListener('ideamizer:cancel-crop', cancelHandler);
    };
  }, [getManager]);

  // Listen for grid toggle
  useEffect(() => {
    const handler = () => {
      const { showGrid } = useEditorStore.getState();
      getManager()?.setGridVisible(showGrid);
    };
    window.addEventListener('ideamizer:toggle-grid', handler);
    return () => window.removeEventListener('ideamizer:toggle-grid', handler);
  }, [getManager]);

  // Listen for snap toggle
  useEffect(() => {
    const handler = () => {
      const { snapToGrid } = useEditorStore.getState();
      getManager()?.setSnapToGrid(snapToGrid);
    };
    window.addEventListener('ideamizer:toggle-snap', handler);
    return () => window.removeEventListener('ideamizer:toggle-snap', handler);
  }, [getManager]);

  // Compute DPI warning for selected image layer
  const currentView = design.views[activeViewId];
  const selectedLayer = currentView?.layers.find((l) => l.id === selectedLayerIds[0]);
  const activeProductView = selectedTemplate?.views.find((v) => v.id === activeViewId);

  const dpiInfo =
    selectedLayer && activeProductView
      ? calculateDpi(selectedLayer, activeProductView.printableArea)
      : null;

  const showDpiWarning = dpiInfo && dpiInfo.status === 'low';

  return (
    <div className="relative flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-8">
      {showDpiWarning && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Low DPI ({dpiInfo.effectiveDpi})
        </div>
      )}
      <div
        className="relative shadow-xl rounded-sm"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
