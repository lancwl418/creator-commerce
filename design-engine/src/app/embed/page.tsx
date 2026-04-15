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

      // Parse raw ERP product data if passed from Portal catalog
      let portalProducts;
      const productsData = params.get('products_data');
      if (productsData) {
        try {
          portalProducts = JSON.parse(decodeURIComponent(productsData));
        } catch {
          console.warn('[Embed] Failed to parse products_data param');
        }
      }

      return {
        mode: 'portal' as const,
        portalTemplateIds: templateIds,
        portalProducts,
        artworkUrl: artworkUrl ? decodeURIComponent(artworkUrl) : undefined,
        designId: params.get('design_id') || undefined,
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
