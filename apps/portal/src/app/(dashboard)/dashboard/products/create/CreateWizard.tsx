'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DESIGN_EDITOR_MESSAGE, isDesignEditorMessage } from '@creator-commerce/shared';
import { createProductsFromDesignPayload } from '@/lib/products/createFromDesignPayload';
import WizardSteps from '../[id]/components/WizardSteps';
import GhostLoader from '@/components/GhostLoader';

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

interface CreateWizardProps {
  creatorId: string;
  templates: string;
  cacheKey: string;
}

export default function CreateWizard({ creatorId, templates, cacheKey }: CreateWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [editorUrl, setEditorUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const handledRef = useRef(false);

  useEffect(() => {
    const origin = window.location.origin;
    setEditorUrl(
      `${DESIGN_ENGINE_URL}/embed` +
        `?templates=${encodeURIComponent(templates)}` +
        `&products_cache_key=${cacheKey}` +
        `&products_cache_url=${encodeURIComponent(`${origin}/api/erp/products-cache`)}` +
        `&parent_origin=${encodeURIComponent(origin)}`,
    );

    const engineOrigin = new URL(DESIGN_ENGINE_URL).origin;

    async function onMessage(e: MessageEvent) {
      if (e.origin !== engineOrigin) return;
      if (!isDesignEditorMessage(e.data) || e.data.type !== DESIGN_EDITOR_MESSAGE.SAVED) return;
      if (handledRef.current) return;
      handledRef.current = true;
      setCreating(true);
      try {
        const created = await createProductsFromDesignPayload(
          supabase,
          creatorId,
          e.data.payload,
        );
        if (created.length === 0) throw new Error('Failed to create product');
        router.push(`/dashboard/products/${created[0].id}?from=create`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create product');
        setCreating(false);
        handledRef.current = false;
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [templates, cacheKey, creatorId, router, supabase]);

  if (creating) {
    return <GhostLoader fullscreen size="lg" message="Creating your product…" />;
  }

  return (
    <div className="space-y-4">
      {/* Wizard top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <Link
          href="/dashboard/catalog"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <div className="hidden sm:block">
          <WizardSteps current="design" />
        </div>
        <div className="w-[72px] shrink-0" aria-hidden />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Embedded design editor */}
      <div
        className="rounded-2xl border border-border overflow-hidden bg-white"
        style={{ height: 'calc(100vh - 170px)' }}
      >
        {editorUrl ? (
          <iframe src={editorUrl} className="w-full h-full border-0" title="Design Editor" />
        ) : (
          <GhostLoader size="md" message="Loading editor…" />
        )}
      </div>
    </div>
  );
}
