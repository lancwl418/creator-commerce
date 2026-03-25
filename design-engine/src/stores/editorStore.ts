import { create } from 'zustand';
import type { EditorTool } from '@/types/editor';
import type { DesignLayer } from '@/types/design';

interface ViewState {
  zoom: number;
}

interface EditorStoreState {
  activeTool: EditorTool;
  zoom: number;
  selectedLayerIds: string[];
  showPrintableArea: boolean;
  clipboard: DesignLayer | null;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  viewStates: Record<string, ViewState>;
  // Actions
  setActiveTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setSelectedLayerIds: (ids: string[]) => void;
  togglePrintableArea: () => void;
  setClipboard: (layer: DesignLayer | null) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  saveViewState: (viewId: string) => void;
  restoreViewState: (viewId: string) => void;
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  activeTool: 'select',
  zoom: 0.7,
  selectedLayerIds: [],
  showPrintableArea: true,
  clipboard: null,
  showGrid: false,
  gridSize: 20,
  snapToGrid: false,
  viewStates: {},

  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  togglePrintableArea: () =>
    set((state) => ({ showPrintableArea: !state.showPrintableArea })),
  setClipboard: (layer) => set({ clipboard: layer ? structuredClone(layer) : null }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGridSize: (size) => set({ gridSize: size }),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  saveViewState: (viewId) =>
    set((state) => ({
      viewStates: {
        ...state.viewStates,
        [viewId]: { zoom: state.zoom },
      },
    })),
  restoreViewState: (viewId) =>
    set((state) => {
      const vs = state.viewStates[viewId];
      if (!vs) return {};
      return { zoom: vs.zoom };
    }),
}));
