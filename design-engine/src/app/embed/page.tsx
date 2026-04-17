'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import EditorPage from '@/components/editor/EditorPage';
import type { EditorConfig } from '@/types/editor-config';

function EmbedPageInner() {
  const params = useSearchParams();

  const config = useMemo<EditorConfig>(() => {
    // Portal mode: ?templates=id1,id2&artwork_url=...&design_id=...
    const templates = params.get('templates');
    const artworkUrl = params.get('artwork_url');
    if (templates) {
      const templateIds = decodeURIComponent(templates).split(',').filter(Boolean);

      // Cache key for fetching product data from Portal API
      const productsCacheKey = params.get('products_cache_key') || undefined;
      const productsCacheUrl = params.get('products_cache_url')
        ? decodeURIComponent(params.get('products_cache_url')!)
        : undefined;

      return {
        mode: 'portal' as const,
        portalTemplateIds: templateIds,
        productsCacheKey,
        productsCacheUrl,
        artworkUrl: artworkUrl ? decodeURIComponent(artworkUrl) : undefined,
        designId: params.get('design_id') || undefined,
        selectedColor: params.get('selected_color')
          ? decodeURIComponent(params.get('selected_color')!)
          : undefined,
      };
    }

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
