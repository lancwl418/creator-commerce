'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DESIGN_EDITOR_MESSAGE, isDesignEditorMessage } from '@creator-commerce/shared';
import { updateProductFromDesignPayload } from '@/lib/products/createFromDesignPayload';
import WizardSteps from '../components/WizardSteps';
import GhostLoader from '@/components/GhostLoader';

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

interface EditDesignWizardProps {
  productId: string;
  templateId: string;
  layers: unknown[];
}

export default function EditDesignWizard({ productId, templateId, layers }: EditDesignWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editorUrl, setEditorUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sentRestoreRef = useRef(false);
  const savedRef = useRef(false);

  // Re-cache the ERP template so the editor can load the same product.
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      try {
        const erpProductId = templateId.replace(/^erp-/, '');
        const res = await fetch('/api/erp/products?pageNo=1&pageSize=100');
        if (!res.ok) throw new Error(`Failed to load product (${res.status})`);
        const data = await res.json();
        const records = data.products || data.result?.records || [];
        const found = records.find((p: { id: string }) => p.id === erpProductId);
        if (!found) throw new Error('Product template not found');

        const cacheRes = await fetch('/api/erp/products-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: [found] }),
        });
        const { key } = await cacheRes.json();
        if (cancelled) return;

        const origin = window.location.origin;
        setEditorUrl(
          `${DESIGN_ENGINE_URL}/embed` +
            `?templates=${encodeURIComponent(templateId)}` +
            `&products_cache_key=${key}` +
            `&products_cache_url=${encodeURIComponent(`${origin}/api/erp/products-cache`)}` +
            `&parent_origin=${encodeURIComponent(origin)}`,
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load editor');
      }
    }
    setup();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // When the editor is ready, send the saved design to restore; on save, update.
  useEffect(() => {
    const engineOrigin = new URL(DESIGN_ENGINE_URL).origin;

    async function onMessage(e: MessageEvent) {
      if (e.origin !== engineOrigin || !isDesignEditorMessage(e.data)) return;

      if (e.data.type === DESIGN_EDITOR_MESSAGE.READY) {
        if (sentRestoreRef.current) return;
        sentRestoreRef.current = true;
        iframeRef.current?.contentWindow?.postMessage(
          { type: DESIGN_EDITOR_MESSAGE.LOAD_DESIGN, design: { layers } },
          engineOrigin,
        );
        return;
      }

      if (e.data.type === DESIGN_EDITOR_MESSAGE.SAVED) {
        if (savedRef.current) return;
        savedRef.current = true;
        setSaving(true);
        try {
          const ok = await updateProductFromDesignPayload(supabase, productId, e.data.payload);
          if (!ok) throw new Error('Failed to save design');
          router.push(`/dashboard/products/${productId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save');
          setSaving(false);
          savedRef.current = false;
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [layers, productId, supabase, router]);

  if (saving) {
    return <GhostLoader fullscreen size="lg" message="Saving your design…" />;
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <Link
          href={`/dashboard/products/${productId}`}
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

      <div
        className="rounded-2xl border border-border overflow-hidden bg-white"
        style={{ height: 'calc(100vh - 170px)' }}
      >
        {editorUrl ? (
          <iframe ref={iframeRef} src={editorUrl} className="w-full h-full border-0" title="Design Editor" />
        ) : (
          <GhostLoader size="md" message="Loading editor…" />
        )}
      </div>
    </div>
  );
}
