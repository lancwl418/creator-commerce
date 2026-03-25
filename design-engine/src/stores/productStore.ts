import { create } from 'zustand';
import type { ProductTemplate } from '@/types/product';

type LoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ProductStoreState {
  templates: ProductTemplate[];
  selectedTemplate: ProductTemplate | null;
  activeViewId: string;
  status: LoadingStatus;
  error: string | null;

  selectTemplate: (templateId: string) => void;
  setActiveView: (viewId: string) => void;

  /** Load templates (demo or standalone mode) */
  setTemplates: (templates: ProductTemplate[]) => void;
  /** Set a single template (embedded mode) */
  setEmbeddedTemplate: (template: ProductTemplate) => void;
  setLoading: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  activeViewId: '',
  status: 'idle',
  error: null,

  selectTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (template) {
      set({
        selectedTemplate: template,
        activeViewId: template.defaultViewId,
      });
    }
  },

  setActiveView: (viewId) => set({ activeViewId: viewId }),

  setTemplates: (templates) => {
    const selected = templates[0] ?? null;
    set({
      templates,
      selectedTemplate: selected,
      activeViewId: selected?.defaultViewId ?? '',
      status: 'loaded',
      error: null,
    });
  },

  setEmbeddedTemplate: (template) => {
    set({
      templates: [template],
      selectedTemplate: template,
      activeViewId: template.defaultViewId,
      status: 'loaded',
      error: null,
    });
  },

  setLoading: () => set({ status: 'loading', error: null }),

  setError: (error) => set({ status: 'error', error }),

  reset: () =>
    set({
      templates: [],
      selectedTemplate: null,
      activeViewId: '',
      status: 'idle',
      error: null,
    }),
}));
