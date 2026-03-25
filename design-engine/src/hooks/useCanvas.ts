'use client';

import { useRef, useEffect, useCallback } from 'react';
import { CanvasManager } from '@/core/canvas/CanvasManager';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<CanvasManager | null>(null);

  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const setSelectedLayerIds = useEditorStore((s) => s.setSelectedLayerIds);

  const prevViewIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !selectedTemplate) return;

    // Save previous view state before switching
    if (prevViewIdRef.current && prevViewIdRef.current !== activeViewId) {
      useEditorStore.getState().saveViewState(prevViewIdRef.current);
    }
    prevViewIdRef.current = activeViewId;

    const manager = new CanvasManager();
    managerRef.current = manager;
    let disposed = false;

    (async () => {
      await manager.initialize(canvasRef.current!, selectedTemplate, activeViewId, {
        onObjectModified: (layerId, transform) => {
          updateLayer(activeViewId, layerId, { transform });
        },
        onSelectionChanged: (layerIds) => {
          setSelectedLayerIds(layerIds);
        },
      });

      // Don't proceed if disposed during await
      if (disposed) return;

      // Initialize design for this template if needed
      const design = useDesignStore.getState().design;
      if (design.productTemplateId !== selectedTemplate.id) {
        useDesignStore.getState().initDesign(
          selectedTemplate.id,
          selectedTemplate.views.map((v) => v.id)
        );
      }

      // Load existing design view
      const view = useDesignStore.getState().design.views[activeViewId];
      if (view && view.layers.length > 0) {
        manager.loadDesignView(view);
      }

      // Restore view state (zoom) for this view
      useEditorStore.getState().restoreViewState(activeViewId);
    })();

    return () => {
      disposed = true;
      // Save state on unmount
      useEditorStore.getState().saveViewState(activeViewId);
      manager.dispose();
      managerRef.current = null;
    };
  }, [selectedTemplate, activeViewId, updateLayer, setSelectedLayerIds]);

  const getManager = useCallback(() => managerRef.current, []);

  return { canvasRef, getManager };
}
