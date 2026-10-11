'use client';

import Link from 'next/link';
import { useDesignEditor } from '@/hooks/products/useDesignEditor';
import { t } from '@/lib/i18n';

interface DesignEditorFrameProps {
  creatorId: string;
  editorUrl: string;
  engineOrigin: string;
  backHref: string;
  intent: 'sync' | 'order';
}

export default function DesignEditorFrame({ creatorId, editorUrl, engineOrigin, backHref, intent }: DesignEditorFrameProps) {
  const { iframeRef, busy, error } = useDesignEditor({ creatorId, editorUrl, engineOrigin, intent });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('design.back')}</Link>
        <p className="text-xs text-gray-400">{t(intent === 'order' ? 'design.hintOrder' : 'design.hint')}</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      {busy && (
        <div role="status" className="rounded-xl bg-brand-50 border border-brand-500/40 px-4 py-2.5 text-sm text-gray-800">
          {t('design.saving')}
        </div>
      )}
      <div className="rounded-2xl border border-border overflow-hidden bg-white" style={{ height: 'calc(100vh - 180px)' }}>
        <iframe ref={iframeRef} src={editorUrl} className="w-full h-full border-0" title={t('design.title')} />
      </div>
    </div>
  );
}
