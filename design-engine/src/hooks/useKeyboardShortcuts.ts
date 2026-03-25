'use client';

import { useEffect } from 'react';
import { useHistory } from './useHistory';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProductStore } from '@/stores/productStore';
import { generateId } from '@/lib/id';

export function useKeyboardShortcuts(
  getManager: () => import('@/core/canvas/CanvasManager').CanvasManager | null
) {
  const { undo, redo } = useHistory();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Don't capture when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const viewId = useProductStore.getState().activeViewId;
      const selectedIds = useEditorStore.getState().selectedLayerIds;
      const designState = useDesignStore.getState();

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        for (const id of selectedIds) {
          designState.removeLayer(viewId, id);
          getManager()?.removeLayerFromCanvas(id);
        }
        useEditorStore.getState().setSelectedLayerIds([]);
      } else if (e.key === 'Escape') {
        getManager()?.deselectAll();
      } else if (isMod && e.key === 'c') {
        // Copy
        if (selectedIds.length === 1) {
          const view = designState.design.views[viewId];
          const layer = view?.layers.find((l) => l.id === selectedIds[0]);
          if (layer) {
            useEditorStore.getState().setClipboard(layer);
          }
        }
      } else if (isMod && e.key === 'v') {
        // Paste
        const clipboard = useEditorStore.getState().clipboard;
        if (clipboard) {
          e.preventDefault();
          const newLayer = {
            ...structuredClone(clipboard),
            id: generateId(),
            name: `${clipboard.name} (paste)`,
            transform: {
              ...clipboard.transform,
              x: clipboard.transform.x + 20,
              y: clipboard.transform.y + 20,
            },
          };
          designState.addLayer(viewId, newLayer);
          window.dispatchEvent(
            new CustomEvent('ideamizer:layer-added', { detail: newLayer })
          );
          useEditorStore.getState().setSelectedLayerIds([newLayer.id]);
          // Update clipboard offset for subsequent pastes
          useEditorStore.getState().setClipboard(newLayer);
        }
      } else if (isMod && e.key === 'd') {
        // Duplicate
        e.preventDefault();
        if (selectedIds.length === 1) {
          const newLayer = designState.duplicateLayer(viewId, selectedIds[0]);
          if (newLayer) {
            window.dispatchEvent(
              new CustomEvent('ideamizer:layer-added', { detail: newLayer })
            );
            useEditorStore.getState().setSelectedLayerIds([newLayer.id]);
          }
        }
      } else if (e.key === ']' && !isMod) {
        // Move layer forward
        e.preventDefault();
        if (selectedIds.length === 1) {
          designState.moveLayerForward(viewId, selectedIds[0]);
          syncCanvasOrder(viewId);
        }
      } else if (e.key === '[' && !isMod) {
        // Move layer backward
        e.preventDefault();
        if (selectedIds.length === 1) {
          designState.moveLayerBackward(viewId, selectedIds[0]);
          syncCanvasOrder(viewId);
        }
      } else if (isMod && e.key === 'a') {
        e.preventDefault();
        // Select all is handled by fabric canvas
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, getManager]);
}

function syncCanvasOrder(viewId: string) {
  const view = useDesignStore.getState().design.views[viewId];
  if (view) {
    const ids = view.layers.map((l) => l.id);
    window.dispatchEvent(
      new CustomEvent('ideamizer:layers-reordered', { detail: ids })
    );
  }
}
