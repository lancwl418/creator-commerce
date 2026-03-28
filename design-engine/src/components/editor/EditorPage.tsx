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
import { useEditorStore } from '@/stores/editorStore';
import { useProductStore } from '@/stores/productStore';
import { useMultiProductStore } from '@/stores/multiProductStore';
import { useTemplateLoader } from '@/hooks/useTemplateLoader';
import { ExportService } from '@/core/design/ExportService';
import { validateDesign } from '@/core/design/DesignValidator';
import { useHistory } from '@/hooks/useHistory';
import type { ValidationResult } from '@/core/design/DesignValidator';
import type { DesignLayer } from '@/types/design';
import type { EditorConfig } from '@/types/editor-config';
import {
  Layers, Package, Upload, X, Undo2, Redo2, ZoomIn, ZoomOut, Save,
} from 'lucide-react';

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
  const [mobilePanel, setMobilePanel] = useState<'none' | 'products' | 'layers' | 'upload'>('none');

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
      // Capture mockup preview of the current canvas
      const currentMockup = await new Promise<string>((resolve) => {
        let resolved = false;
        const handler = (dataUrl: string) => { resolved = true; resolve(dataUrl); };
        window.dispatchEvent(new CustomEvent('ideamizer:capture-mockup', { detail: handler }));
        // Fallback if event not handled
        setTimeout(() => { if (!resolved) resolve(''); }, 200);
      });

      // Save current product first
      const currentDesign = structuredClone(useDesignStore.getState().design);
      const multiStore = useMultiProductStore.getState();
      if (multiStore.isMultiProduct) {
        multiStore.saveCurrentProduct(currentDesign, currentMockup || undefined);
      }

      // Get artwork URL as fallback preview
      const artworkUrl = multiStore.artworkUrl
        || new URLSearchParams(window.location.search).get('artwork_url')
        || null;

      // Collect all products with their layers
      const productsToSave = multiStore.isMultiProduct
        ? multiStore.products.map((entry) => ({
            template_id: entry.template.id,
            name: entry.template.name,
            base_cost: parseFloat(String(entry.template.metadata?.price ?? 0)) || 0,
            thumbnail: entry.thumbnail || artworkUrl,
            layers: Object.values(entry.design.views).flatMap((v) => v.layers),
          }))
        : [{
            template_id: selectedTemplate?.id ?? '',
            name: selectedTemplate?.name ?? '',
            base_cost: 0,
            thumbnail: currentMockup || artworkUrl,
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
        // Redirect to Portal's import page with data in URL hash
        // This avoids CORS issues — the Portal page runs client-side
        // with auth cookies and saves to DB directly
        const payload = encodeURIComponent(JSON.stringify({
          design_id: editorConfig.designId,
          products: mergedProducts,
          title_prefix: decodeURIComponent(titlePrefix),
        }));

        const portalOrigin = new URL(callbackUrl).origin;
        window.location.href = `${portalOrigin}/dashboard/products/import#${payload}`;
        return;
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
    <div className="h-[100dvh] flex flex-col overflow-hidden">
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

      {/* Desktop toolbar */}
      <div className="hidden md:block">
        <Toolbar
          onExportJSON={handleExportJSON}
          onExportPNG={handleExportPNG}
          onSave={handleSave}
        />
      </div>

      {/* Mobile compact toolbar */}
      <MobileToolbar onSave={handleSave} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Multi-product panel — desktop only */}
        <div className="hidden md:block">
          {isMultiProduct && <MultiProductPanel />}
        </div>

        {/* Left sidebar — desktop only */}
        <div className="hidden md:flex w-56 flex-col border-r border-gray-200 bg-white overflow-y-auto">
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

        {/* Canvas area — full width on mobile */}
        <EditorShell />

        {/* Right sidebar — desktop only */}
        <div className="hidden md:flex w-64 bg-white border-l border-gray-200 flex-col overflow-y-auto">
          <LayerPanel onReorderLayers={handleReorderLayers} onDuplicateLayer={handleLayerAdded} />
          <div className="border-t border-gray-200">
            <PropertiesPanel onReorderLayers={handleReorderLayers} />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden bg-white border-t border-gray-200 flex items-center safe-pb">
        <MobileTabBtn
          icon={<Package className="w-5 h-5" />}
          label="Products"
          active={mobilePanel === 'products'}
          onClick={() => setMobilePanel(mobilePanel === 'products' ? 'none' : 'products')}
        />
        <MobileTabBtn
          icon={<Upload className="w-5 h-5" />}
          label="Upload"
          active={mobilePanel === 'upload'}
          onClick={() => setMobilePanel(mobilePanel === 'upload' ? 'none' : 'upload')}
        />
        <MobileTabBtn
          icon={<Layers className="w-5 h-5" />}
          label="Layers"
          active={mobilePanel === 'layers'}
          onClick={() => setMobilePanel(mobilePanel === 'layers' ? 'none' : 'layers')}
        />
        {isPortal && (
          <button
            onClick={handleSaveAndFinish}
            disabled={saving}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-blue-600"
          >
            <Save className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{saving ? 'Saving...' : 'Finish'}</span>
          </button>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {mobilePanel !== 'none' && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobilePanel('none')} />
          <div className="relative bg-white rounded-t-2xl max-h-[65vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {mobilePanel === 'products' && 'Products'}
                {mobilePanel === 'upload' && 'Upload Design'}
                {mobilePanel === 'layers' && 'Layers & Properties'}
              </h3>
              <button onClick={() => setMobilePanel('none')} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mobilePanel === 'products' && (
                <div>
                  {isMultiProduct && <MultiProductPanel />}
                  {!isEmbedded && <ProductSelector />}
                </div>
              )}
              {mobilePanel === 'upload' && (
                <div className="p-4">
                  <DesignUploader onLayerAdded={(layer) => { handleLayerAdded(layer); setMobilePanel('none'); }} />
                </div>
              )}
              {mobilePanel === 'layers' && (
                <div>
                  <LayerPanel onReorderLayers={handleReorderLayers} onDuplicateLayer={handleLayerAdded} />
                  <div className="border-t border-gray-200">
                    <PropertiesPanel onReorderLayers={handleReorderLayers} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save & Finish — desktop only (mobile has it in tab bar) */}
      {isPortal && (
        <div className="hidden md:block fixed bottom-6 right-6 z-50">
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

/* ── Mobile helper components ── */

function MobileTabBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? 'text-blue-600' : 'text-gray-500'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MobileToolbar({ onSave }: { onSave?: () => void }) {
  const { undo, redo, canUndo, canRedo } = useHistory();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  return (
    <div className="md:hidden flex items-center gap-0.5 bg-white border-b border-gray-200 px-2 py-1">
      <button onClick={undo} disabled={!canUndo()} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
        <Undo2 className="w-4 h-4 text-gray-700" />
      </button>
      <button onClick={redo} disabled={!canRedo()} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
        <Redo2 className="w-4 h-4 text-gray-700" />
      </button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button onClick={() => setZoom(Math.max(0.2, zoom - 0.15))} className="p-2 rounded-lg hover:bg-gray-100">
        <ZoomOut className="w-4 h-4 text-gray-700" />
      </button>
      <span className="text-[11px] text-gray-500 w-9 text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(Math.min(3, zoom + 0.15))} className="p-2 rounded-lg hover:bg-gray-100">
        <ZoomIn className="w-4 h-4 text-gray-700" />
      </button>
      <div className="flex-1" />
      <button onClick={onSave} className="p-2 rounded-lg hover:bg-gray-100" title="Save">
        <Save className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
}
