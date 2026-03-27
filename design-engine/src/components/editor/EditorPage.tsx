'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import EditorShell from './EditorShell';
import Toolbar from './Toolbar';
import ProductSelector from './ProductSelector';
import MultiProductPanel from './MultiProductPanel';
import DesignUploader from './DesignUploader';
import LayerPanel from './LayerPanel';
import PropertiesPanel from './PropertiesPanel';
import ValidationDialog from './ValidationDialog';
import { EditorConfigContext, useEditorConfig } from './EditorConfigContext';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { useMultiProductStore } from '@/stores/multiProductStore';
import { useTemplateLoader } from '@/hooks/useTemplateLoader';
import { ExportService } from '@/core/design/ExportService';
import { validateDesign } from '@/core/design/DesignValidator';
import type { ValidationResult } from '@/core/design/DesignValidator';
import type { DesignLayer } from '@/types/design';
import type { EditorConfig } from '@/types/editor-config';

interface EditorPageProps {
  config?: EditorConfig;
}

export default function EditorPage({ config }: EditorPageProps) {
  const resolvedConfig: EditorConfig = config ?? { mode: 'demo' };

  return (
    <EditorConfigContext.Provider value={resolvedConfig}>
      <EditorPageInner />
    </EditorConfigContext.Provider>
  );
}

function EditorPageInner() {
  const editorConfig = useEditorConfig();
  const status = useTemplateLoader();

  const design = useDesignStore((s) => s.design);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const error = useProductStore((s) => s.error);
  const initDesign = useDesignStore((s) => s.initDesign);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const pendingExportRef = useRef<'json' | 'png' | null>(null);

  const isEmbedded = editorConfig.mode === 'embedded';
  const isPortal = editorConfig.mode === 'portal';
  const isMultiProduct = useMultiProductStore((s) => s.isMultiProduct);
  const [saving, setSaving] = useState(false);

  // Initialize design on first render
  useEffect(() => {
    if (selectedTemplate && !design.productTemplateId) {
      initDesign(
        selectedTemplate.id,
        selectedTemplate.views.map((v) => v.id)
      );
    }
  }, [selectedTemplate, design.productTemplateId, initDesign]);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!design.productTemplateId) return;
    const timer = setTimeout(() => {
      ExportService.saveToLocal(design);
    }, 1000);
    return () => clearTimeout(timer);
  }, [design]);

  const doExport = useCallback((format: 'json' | 'png') => {
    if (format === 'json') {
      if (editorConfig.onExport) {
        editorConfig.onExport(ExportService.exportJSON(design));
      } else {
        ExportService.downloadJSON(design);
      }
    } else {
      window.dispatchEvent(new CustomEvent('ideamizer:export-png'));
    }
  }, [design, editorConfig]);

  const handleExportWithValidation = useCallback((format: 'json' | 'png') => {
    if (!selectedTemplate) {
      doExport(format);
      return;
    }
    const result = validateDesign(design, selectedTemplate);
    if (result.issues.length === 0) {
      doExport(format);
    } else {
      pendingExportRef.current = format;
      setValidationResult(result);
    }
  }, [design, selectedTemplate, doExport]);

  const handleExportJSON = useCallback(() => {
    handleExportWithValidation('json');
  }, [handleExportWithValidation]);

  const handleExportPNG = useCallback(() => {
    handleExportWithValidation('png');
  }, [handleExportWithValidation]);

  const handleSave = useCallback(() => {
    ExportService.saveToLocal(design);
    if (editorConfig.onSave) {
      editorConfig.onSave(ExportService.exportJSON(design));
    }
  }, [design, editorConfig]);

  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imported = ExportService.importJSON(reader.result as string);
        if (imported) {
          loadDesign(imported);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadDesign]
  );

  const handleLayerAdded = useCallback((_layer: DesignLayer) => {
    window.dispatchEvent(
      new CustomEvent('ideamizer:layer-added', { detail: _layer })
    );
  }, []);

  const handleReorderLayers = useCallback((orderedIds: string[]) => {
    window.dispatchEvent(
      new CustomEvent('ideamizer:layers-reordered', { detail: orderedIds })
    );
  }, []);

  // Save & Finish: save all products back to Portal and redirect
  const handleSaveAndFinish = useCallback(async () => {
    if (!isPortal || !editorConfig.designId) return;
    setSaving(true);

    try {
      // Save current product first
      const currentDesign = structuredClone(useDesignStore.getState().design);
      const multiStore = useMultiProductStore.getState();
      if (multiStore.isMultiProduct) {
        multiStore.saveCurrentProduct(currentDesign);
      }

      // Collect all products with their layers
      const productsToSave = multiStore.isMultiProduct
        ? multiStore.products.map((entry) => ({
            template_id: entry.template.id,
            name: entry.template.name,
            base_cost: parseFloat(String(entry.template.metadata?.price ?? 0)) || 0,
            thumbnail: entry.thumbnail,
            layers: Object.values(entry.design.views).flatMap((v) => v.layers),
          }))
        : [{
            template_id: selectedTemplate?.id ?? '',
            name: selectedTemplate?.name ?? '',
            base_cost: 0,
            thumbnail: null,
            layers: Object.values(currentDesign.views).flatMap((v) => v.layers),
          }];

      // Parse callback_url and products_meta from URL params
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callback_url');
      const productsMeta = params.get('products_meta');
      const titlePrefix = params.get('title_prefix') || 'Design';

      // Merge Portal metadata with editor layer data
      let portalProducts: { id: string; name: string; base_cost: number; source: string; thumbnail: string | null }[] = [];
      if (productsMeta) {
        try {
          portalProducts = JSON.parse(decodeURIComponent(productsMeta));
        } catch { /* ignore */ }
      }

      const mergedProducts = productsToSave.map((p) => {
        const portalMatch = portalProducts.find((pm) => pm.id === p.template_id);
        return {
          template_id: p.template_id,
          name: portalMatch?.name || p.name,
          base_cost: portalMatch?.base_cost || p.base_cost,
          thumbnail: p.thumbnail || portalMatch?.thumbnail,
          layers: p.layers,
        };
      });

      if (callbackUrl) {
        // Call Portal API to create records
        const res = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            design_id: editorConfig.designId,
            products: mergedProducts,
            title_prefix: decodeURIComponent(titlePrefix),
          }),
        });

        if (res.ok) {
          // Redirect back to Portal products page
          const origin = new URL(callbackUrl).origin;
          window.location.href = `${origin}/dashboard/products`;
          return;
        }

        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Save failed: ${err.error || 'Unknown error'}`);
      } else {
        // No callback — just save locally
        ExportService.saveToLocal(currentDesign);
        alert('Design saved locally.');
      }
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [isPortal, editorConfig, selectedTemplate]);

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 font-medium mb-2">Failed to load templates</div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {validationResult && (
        <ValidationDialog
          result={validationResult}
          onExportAnyway={() => {
            const format = pendingExportRef.current;
            setValidationResult(null);
            pendingExportRef.current = null;
            if (format) doExport(format);
          }}
          onCancel={() => {
            setValidationResult(null);
            pendingExportRef.current = null;
          }}
        />
      )}
      <Toolbar
        onExportJSON={handleExportJSON}
        onExportPNG={handleExportPNG}
        onSave={handleSave}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Multi-product panel (left of everything when active) */}
        {isMultiProduct && <MultiProductPanel />}

        {/* Left sidebar */}
        <div className="w-56 flex flex-col border-r border-gray-200 bg-white overflow-y-auto">
          {!isEmbedded && <ProductSelector />}
          <div className="p-3 border-t border-gray-200">
            <DesignUploader onLayerAdded={handleLayerAdded} />
            <button
              onClick={handleImportJSON}
              className="w-full mt-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>

        {/* Canvas area */}
        <EditorShell />

        {/* Right sidebar: Layers + Properties */}
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
          <LayerPanel onReorderLayers={handleReorderLayers} onDuplicateLayer={handleLayerAdded} />
          <div className="border-t border-gray-200">
            <PropertiesPanel onReorderLayers={handleReorderLayers} />
          </div>
        </div>
      </div>

      {/* Save & Finish button for Portal mode */}
      {isPortal && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveAndFinish}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save & Finish'}
          </button>
        </div>
      )}
    </div>
  );
}
