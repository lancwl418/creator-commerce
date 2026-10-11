'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DESIGN_EDITOR_MESSAGE, isDesignEditorMessage } from '@creator-commerce/shared';
import { parseDesignPayload } from '@creator-commerce/shared/products';
import { createDesignedProducts } from '@/lib/products/design-payload';
import { t } from '@/lib/i18n';

interface DesignEditorSession {
  creatorId: string;
  editorUrl: string;
  engineOrigin: string;
  /** 保存后去同步店铺还是直接下单 */
  intent: 'sync' | 'order';
}

/** 监听编辑器的保存消息 → 建产品草稿 → 进入该产品的同步页。 */
export function useDesignEditor({ creatorId, editorUrl, engineOrigin, intent }: DesignEditorSession) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handled = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    handled.current = false;
    async function onMessage(event: MessageEvent) {
      if (event.origin !== engineOrigin || event.source !== iframeRef.current?.contentWindow || !isDesignEditorMessage(event.data)) return;
      if (event.data.type !== DESIGN_EDITOR_MESSAGE.SAVED || handled.current) return;
      handled.current = true;
      setBusy(true);
      setError('');
      try {
        const created = await createDesignedProducts(creatorId, parseDesignPayload(event.data.payload));
        if (active) router.push(`/my-products/${created[0].id}/${intent === 'order' ? 'order' : 'sync'}`);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t('design.error.save'));
          setBusy(false);
          handled.current = false;
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => { active = false; window.removeEventListener('message', onMessage); };
  }, [creatorId, editorUrl, engineOrigin, intent, router]);

  return { iframeRef, busy, error };
}
