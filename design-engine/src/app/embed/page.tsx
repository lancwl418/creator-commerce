'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import EditorPage from '@/components/editor/EditorPage';
import { usePostMessageBridge } from '@/hooks/usePostMessageBridge';
import { ExportService } from '@/core/design/ExportService';
import { useDesignStore } from '@/stores/designStore';
import type { EditorConfig } from '@/types/editor-config';
import type { ProductTemplate } from '@/types/product';

// ── PostMessage mode (when running inside an iframe) ─────────────

function EmbedPostMessageMode() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const metadataRef = useRef<Record<string, string> | undefined>(undefined);

  const handleInit = useCallback(
    (template: ProductTemplate, designJson?: string, metadata?: Record<string, string>) => {
      metadataRef.current = metadata;

      // If a saved design JSON is provided, restore it
      if (designJson) {
        const imported = ExportService.importJSON(designJson);
        if (imported) {
          useDesignStore.getState().loadDesign(imported);
        }
      }

      setConfig({
        mode: 'embedded',
        template,
        onExport: (json: string, pngDataUrl?: string) => {
          bridge.sendExportResult(json, pngDataUrl, metadataRef.current);
        },
        onSave: (json: string) => {
          bridge.sendExportResult(json, undefined, metadataRef.current);
        },
      });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleRequestExport = useCallback((format: 'png' | 'json' | 'both') => {
    // Trigger export via the same mechanism EditorPage uses
    if (format === 'json' || format === 'both') {
      const design = useDesignStore.getState().design;
      const json = ExportService.exportJSON(design);

      if (format === 'json') {
        bridge.sendExportResult(json, undefined, metadataRef.current);
        return;
      }

      // 'both': trigger PNG export with callback, JSON is included
      window.dispatchEvent(
        new CustomEvent('ideamizer:export-png', {
          detail: {
            callback: (pngDataUrl: string) => {
              bridge.sendExportResult(json, pngDataUrl, metadataRef.current);
            },
          },
        })
      );
    } else {
      // 'png' only
      const design = useDesignStore.getState().design;
      const json = ExportService.exportJSON(design);
      window.dispatchEvent(
        new CustomEvent('ideamizer:export-png', {
          detail: {
            callback: (pngDataUrl: string) => {
              bridge.sendExportResult(json, pngDataUrl, metadataRef.current);
            },
          },
        })
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allowedOrigins = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
    if (!env) return [];
    return env.split(',').map((s) => s.trim()).filter(Boolean);
  }, []);

  const bridge = usePostMessageBridge({
    allowedOrigins,
    onInit: handleInit,
    onRequestExport: handleRequestExport,
  });

  // Notify design changes
  const design = useDesignStore((s) => s.design);
  const prevLayerCountRef = useRef(-1);

  useEffect(() => {
    if (!config) return;
    const currentView = Object.values(design.views)[0];
    const layerCount = currentView?.layers.length ?? 0;
    if (prevLayerCountRef.current !== layerCount) {
      prevLayerCountRef.current = layerCount;
      bridge.sendDesignChanged(layerCount > 0);
    }
  }, [design, config, bridge]);

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Waiting for host to initialize...</div>
      </div>
    );
  }

  return <EditorPage config={config} />;
}

// ── URL param mode (direct access, no iframe) ────────────────────

function EmbedUrlParamMode() {
  const params = useSearchParams();

  const config = useMemo<EditorConfig>(() => {
    // Embedded mode: ?template=<encodedJSON>
    const templateJson = params.get('template');
    if (templateJson) {
      try {
        return {
          mode: 'embedded' as const,
          template: JSON.parse(decodeURIComponent(templateJson)),
        };
      } catch {
        console.warn('[Embed] Failed to parse template param, falling back to demo mode');
        return { mode: 'demo' };
      }
    }

    // Standalone mode: ?api=<endpoint>
    const apiEndpoint = params.get('api');
    if (apiEndpoint) {
      return {
        mode: 'standalone' as const,
        apiEndpoint: decodeURIComponent(apiEndpoint),
      };
    }

    // Fallback to demo
    return { mode: 'demo' };
  }, [params]);

  return <EditorPage config={config} />;
}

// ── Main embed page — auto-detect iframe vs direct access ────────

function EmbedPageInner() {
  const [isIframe, setIsIframe] = useState<boolean | null>(null);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Wait for client-side detection
  if (isIframe === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (isIframe) {
    return <EmbedPostMessageMode />;
  }

  return <EmbedUrlParamMode />;
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <EmbedPageInner />
    </Suspense>
  );
}
