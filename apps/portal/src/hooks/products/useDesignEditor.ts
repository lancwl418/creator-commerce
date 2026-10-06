'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DESIGN_EDITOR_MESSAGE, isDesignEditorMessage } from '@creator-commerce/shared';
import { buildCachedEditorUrl, getDesignEngineUrl } from '@/lib/design-engine';
import { cacheErpProducts, fetchErpProduct } from '@/lib/api/erp-products';
import { importDesignProducts, saveProductDesign } from '@/lib/products/mutations';
import { parseDesignPayload } from '@/lib/products/importPayload';
import type { ProductEditorSession } from '@/lib/types/design-editor';

const EMPTY_LAYERS: unknown[] = [];

export function useDesignEditor(session: ProductEditorSession) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handled = useRef(false);
  const restored = useRef(false);
  const [editorUrl, setEditorUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mode = session.mode;
  const templates = mode === 'create' ? session.templates : session.templateId;
  const cacheKey = mode === 'create' ? session.cacheKey : '';
  const creatorId = mode === 'create' ? session.creatorId : '';
  const productId = mode === 'edit' ? session.productId : '';
  const layers = mode === 'edit' ? session.layers : EMPTY_LAYERS;

  useEffect(() => {
    const controller = new AbortController();
    handled.current = false;
    restored.current = false;
    setEditorUrl('');
    setError('');
    async function setup() {
      const key = mode === 'create' ? cacheKey
        : await cacheErpProducts([await fetchErpProduct(templates.replace(/^erp-/, ''), controller.signal)], controller.signal);
      if (!controller.signal.aborted) setEditorUrl(buildCachedEditorUrl(templates, key, window.location.origin));
    }
    setup().catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load editor');
    });
    return () => controller.abort();
  }, [mode, templates, cacheKey]);

  useEffect(() => {
    if (!editorUrl) return;
    let active = true;
    const engineOrigin = new URL(getDesignEngineUrl()).origin;
    async function onMessage(event: MessageEvent) {
      if (event.origin !== engineOrigin || event.source !== iframeRef.current?.contentWindow || !isDesignEditorMessage(event.data)) return;
      if (event.data.type === DESIGN_EDITOR_MESSAGE.READY && mode === 'edit' && !restored.current) {
        restored.current = true;
        iframeRef.current?.contentWindow?.postMessage({ type: DESIGN_EDITOR_MESSAGE.LOAD_DESIGN, design: { layers } }, engineOrigin);
      }
      if (event.data.type !== DESIGN_EDITOR_MESSAGE.SAVED || handled.current) return;
      handled.current = true;
      setBusy(true);
      setError('');
      try {
        const payload = parseDesignPayload(event.data.payload);
        if (mode === 'create') {
          const created = await importDesignProducts(creatorId, payload);
          if (active) router.push(`/dashboard/products/${created[0].id}?from=create`);
        } else {
          await saveProductDesign(productId, payload);
          if (active) router.push(`/dashboard/products/${productId}`);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to save design');
          setBusy(false);
          handled.current = false;
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => { active = false; window.removeEventListener('message', onMessage); };
  }, [editorUrl, mode, creatorId, productId, layers, router]);

  return { iframeRef, editorUrl, busy, error };
}
