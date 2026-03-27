import { create } from 'zustand';
import type { ProductTemplate, ProductView } from '@/types/product';

type LoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ProductStoreState {
  templates: ProductTemplate[];
  selectedTemplate: ProductTemplate | null;
  activeViewId: string;
  status: LoadingStatus;
  error: string | null;
  /** Increments on every selectTemplate call to force canvas re-init (handles same-template switching) */
  _reinitToken: number;

  selectTemplate: (templateId: string) => void;
  setActiveView: (viewId: string) => void;

  /** Load templates (demo or standalone mode) */
  setTemplates: (templates: ProductTemplate[]) => void;
  /** Append templates without replacing existing ones */
  appendTemplates: (templates: ProductTemplate[]) => void;
  /** Set a single template (embedded mode) */
  setEmbeddedTemplate: (template: ProductTemplate) => void;
  /** Update a specific view within a template */
  updateTemplateView: (templateId: string, viewId: string, updates: Partial<ProductView>) => void;
  /** Merge metadata into a template */
  updateTemplateMetadata: (templateId: string, metadata: Record<string, unknown>) => void;
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
  _reinitToken: 0,

  selectTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (template) {
      set((s) => ({
        selectedTemplate: template,
        activeViewId: template.defaultViewId,
        _reinitToken: s._reinitToken + 1,
      }));
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

  appendTemplates: (newTemplates) => {
    set((state) => {
      const existingIds = new Set(state.templates.map((t) => t.id));
      const unique = newTemplates.filter((t) => !existingIds.has(t.id));
      if (unique.length === 0) return state;
      return { templates: [...state.templates, ...unique] };
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

  updateTemplateView: (templateId, viewId, updates) => {
    set((state) => {
      const templates = state.templates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          views: t.views.map((v) =>
            v.id === viewId ? { ...v, ...updates } : v
          ),
        };
      });
      const updatedTemplate = templates.find((t) => t.id === templateId) ?? null;
      return {
        templates,
        selectedTemplate:
          state.selectedTemplate?.id === templateId ? updatedTemplate : state.selectedTemplate,
      };
    });
  },

  updateTemplateMetadata: (templateId, metadata) => {
    set((state) => {
      const templates = state.templates.map((t) => {
        if (t.id !== templateId) return t;
        return { ...t, metadata: { ...t.metadata, ...metadata } };
      });
      const updatedTemplate = templates.find((t) => t.id === templateId) ?? null;
      return {
        templates,
        selectedTemplate:
          state.selectedTemplate?.id === templateId ? updatedTemplate : state.selectedTemplate,
      };
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
      _reinitToken: 0,
    }),
}));
