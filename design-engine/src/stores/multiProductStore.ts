import { create } from 'zustand';
import type { ProductTemplate } from '@/types/product';
import type { DesignDocument, DesignView } from '@/types/design';
import { generateId } from '@/lib/id';

export interface ProductEntry {
  template: ProductTemplate;
  design: DesignDocument;
  thumbnail: string | null;
  isDirty: boolean;
}

interface MultiProductState {
  isMultiProduct: boolean;
  artworkUrl: string | null;
  products: ProductEntry[];
  activeIndex: number;

  // Actions
  enableMultiProduct: () => void;
  setArtworkUrl: (url: string) => void;
  addProduct: (template: ProductTemplate) => void;
  removeProduct: (index: number) => void;
  setActiveProduct: (index: number) => void;
  saveCurrentProduct: (design: DesignDocument, thumbnail?: string) => void;
  updateThumbnail: (index: number, thumbnail: string) => void;
  applyToAll: (sourceIndex: number) => void;
  getActiveProduct: () => ProductEntry | null;
  reset: () => void;
}

function createDesignForTemplate(template: ProductTemplate): DesignDocument {
  const views: Record<string, DesignView> = {};
  for (const view of template.views) {
    views[view.id] = { viewId: view.id, layers: [] };
  }
  return {
    version: '1.0.0',
    id: generateId(),
    name: `Design — ${template.name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productTemplateId: template.id,
    views,
    metadata: {},
  };
}

export const useMultiProductStore = create<MultiProductState>((set, get) => ({
  isMultiProduct: false,
  artworkUrl: null,
  products: [],
  activeIndex: 0,

  enableMultiProduct: () => set({ isMultiProduct: true }),

  setArtworkUrl: (url) => set({ artworkUrl: url }),

  addProduct: (template) => {
    const state = get();
    // Don't add duplicate
    if (state.products.some((p) => p.template.id === template.id)) return;

    const entry: ProductEntry = {
      template,
      design: createDesignForTemplate(template),
      thumbnail: null,
      isDirty: false,
    };

    set((s) => ({
      products: [...s.products, entry],
      isMultiProduct: true,
    }));
  },

  removeProduct: (index) => {
    set((s) => {
      const products = s.products.filter((_, i) => i !== index);
      let activeIndex = s.activeIndex;
      if (activeIndex >= products.length) {
        activeIndex = Math.max(0, products.length - 1);
      }
      return {
        products,
        activeIndex,
        isMultiProduct: products.length > 0,
      };
    });
  },

  setActiveProduct: (index) => set({ activeIndex: index }),

  saveCurrentProduct: (design, thumbnail) => {
    set((s) => {
      const products = [...s.products];
      if (!products[s.activeIndex]) return s;
      products[s.activeIndex] = {
        ...products[s.activeIndex],
        design,
        thumbnail: thumbnail ?? products[s.activeIndex].thumbnail,
        isDirty: false,
      };
      return { products };
    });
  },

  updateThumbnail: (index, thumbnail) => {
    set((s) => {
      const products = [...s.products];
      if (!products[index]) return s;
      products[index] = { ...products[index], thumbnail };
      return { products };
    });
  },

  applyToAll: (sourceIndex) => {
    const state = get();
    const source = state.products[sourceIndex];
    if (!source) return;

    const sourceView = Object.values(source.design.views)[0];
    if (!sourceView || sourceView.layers.length === 0) return;

    const sourceTemplate = source.template;
    const sourceArea = sourceTemplate.views[0]?.printableArea;
    if (!sourceArea) return;

    set((s) => {
      const products = s.products.map((entry, i) => {
        if (i === sourceIndex) return entry;

        const targetArea = entry.template.views[0]?.printableArea;
        if (!targetArea) return entry;

        // Calculate scale ratio between printable areas
        const scaleX = targetArea.width / sourceArea.width;
        const scaleY = targetArea.height / sourceArea.height;
        const scale = Math.min(scaleX, scaleY);

        // Map layers from source to target
        const newViews: Record<string, DesignView> = {};
        for (const view of entry.template.views) {
          const mappedLayers = sourceView.layers.map((layer) => ({
            ...structuredClone(layer),
            id: generateId(),
            transform: {
              ...layer.transform,
              x: layer.transform.x * scale,
              y: layer.transform.y * scale,
              scaleX: layer.transform.scaleX * scale,
              scaleY: layer.transform.scaleY * scale,
            },
          }));
          newViews[view.id] = { viewId: view.id, layers: mappedLayers };
        }

        return {
          ...entry,
          design: {
            ...entry.design,
            views: newViews,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
          thumbnail: null, // needs refresh
        };
      });
      return { products };
    });
  },

  getActiveProduct: () => {
    const state = get();
    return state.products[state.activeIndex] ?? null;
  },

  reset: () =>
    set({
      isMultiProduct: false,
      artworkUrl: null,
      products: [],
      activeIndex: 0,
    }),
}));
