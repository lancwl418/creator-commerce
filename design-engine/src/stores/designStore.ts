import { create } from 'zustand';
import { temporal } from 'zundo';
import type { DesignDocument, DesignLayer, DesignView } from '@/types/design';
import { generateId } from '@/lib/id';

interface DesignStoreState {
  design: DesignDocument;
  // Actions
  initDesign: (productTemplateId: string, viewIds: string[]) => void;
  loadDesign: (design: DesignDocument) => void;
  addLayer: (viewId: string, layer: DesignLayer) => void;
  removeLayer: (viewId: string, layerId: string) => void;
  updateLayer: (viewId: string, layerId: string, changes: Partial<DesignLayer>) => void;
  reorderLayers: (viewId: string, orderedIds: string[]) => void;
  setDesignName: (name: string) => void;
  duplicateLayer: (viewId: string, layerId: string) => DesignLayer | null;
  moveLayerForward: (viewId: string, layerId: string) => void;
  moveLayerBackward: (viewId: string, layerId: string) => void;
  moveLayerToFront: (viewId: string, layerId: string) => void;
  moveLayerToBack: (viewId: string, layerId: string) => void;
}

function createEmptyDesign(): DesignDocument {
  return {
    version: '1.0.0',
    id: generateId(),
    name: 'Untitled Design',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productTemplateId: '',
    views: {},
    metadata: {},
  };
}

export const useDesignStore = create<DesignStoreState>()(
  temporal(
    (set) => ({
      design: createEmptyDesign(),

      initDesign: (productTemplateId, viewIds) => {
        const views: Record<string, DesignView> = {};
        for (const viewId of viewIds) {
          views[viewId] = { viewId, layers: [] };
        }
        set({
          design: {
            ...createEmptyDesign(),
            productTemplateId,
            views,
          },
        });
      },

      loadDesign: (design) => {
        set({ design });
      },

      addLayer: (viewId, layer) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: {
                ...state.design.views,
                [viewId]: {
                  ...view,
                  layers: [...view.layers, layer],
                },
              },
            },
          };
        }),

      removeLayer: (viewId, layerId) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: {
                ...state.design.views,
                [viewId]: {
                  ...view,
                  layers: view.layers.filter((l) => l.id !== layerId),
                },
              },
            },
          };
        }),

      updateLayer: (viewId, layerId, changes) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: {
                ...state.design.views,
                [viewId]: {
                  ...view,
                  layers: view.layers.map((l) =>
                    l.id === layerId ? { ...l, ...changes } : l
                  ),
                },
              },
            },
          };
        }),

      reorderLayers: (viewId, orderedIds) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          const layerMap = new Map(view.layers.map((l) => [l.id, l]));
          const reordered = orderedIds
            .map((id) => layerMap.get(id))
            .filter((l): l is DesignLayer => l !== undefined);
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: {
                ...state.design.views,
                [viewId]: { ...view, layers: reordered },
              },
            },
          };
        }),

      setDesignName: (name) =>
        set((state) => ({
          design: {
            ...state.design,
            name,
            updatedAt: new Date().toISOString(),
          },
        })),

      duplicateLayer: (viewId, layerId) => {
        const state = useDesignStore.getState();
        const view = state.design.views[viewId];
        if (!view) return null;
        const source = view.layers.find((l) => l.id === layerId);
        if (!source) return null;

        const newLayer: DesignLayer = {
          ...structuredClone(source),
          id: generateId(),
          name: `${source.name} (copy)`,
          transform: {
            ...source.transform,
            x: source.transform.x + 10,
            y: source.transform.y + 10,
          },
        };

        set((s) => {
          const v = s.design.views[viewId];
          if (!v) return s;
          const idx = v.layers.findIndex((l) => l.id === layerId);
          const layers = [...v.layers];
          layers.splice(idx + 1, 0, newLayer);
          return {
            design: {
              ...s.design,
              updatedAt: new Date().toISOString(),
              views: { ...s.design.views, [viewId]: { ...v, layers } },
            },
          };
        });
        return newLayer;
      },

      moveLayerForward: (viewId, layerId) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          const layers = [...view.layers];
          const idx = layers.findIndex((l) => l.id === layerId);
          if (idx === -1 || idx >= layers.length - 1) return state;
          [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: { ...state.design.views, [viewId]: { ...view, layers } },
            },
          };
        }),

      moveLayerBackward: (viewId, layerId) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          const layers = [...view.layers];
          const idx = layers.findIndex((l) => l.id === layerId);
          if (idx <= 0) return state;
          [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: { ...state.design.views, [viewId]: { ...view, layers } },
            },
          };
        }),

      moveLayerToFront: (viewId, layerId) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          const layers = view.layers.filter((l) => l.id !== layerId);
          const target = view.layers.find((l) => l.id === layerId);
          if (!target) return state;
          layers.push(target);
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: { ...state.design.views, [viewId]: { ...view, layers } },
            },
          };
        }),

      moveLayerToBack: (viewId, layerId) =>
        set((state) => {
          const view = state.design.views[viewId];
          if (!view) return state;
          const layers = view.layers.filter((l) => l.id !== layerId);
          const target = view.layers.find((l) => l.id === layerId);
          if (!target) return state;
          layers.unshift(target);
          return {
            design: {
              ...state.design,
              updatedAt: new Date().toISOString(),
              views: { ...state.design.views, [viewId]: { ...view, layers } },
            },
          };
        }),
    }),
    {
      limit: 50,
      partialize: (state) => ({ design: state.design }),
    }
  )
);
