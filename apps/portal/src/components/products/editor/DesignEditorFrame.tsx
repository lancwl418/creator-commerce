import Link from 'next/link';
import type { RefObject } from 'react';
import WizardSteps from './WizardSteps';
import GhostLoader from '@/components/GhostLoader';

interface DesignEditorFrameProps {
  backHref: string;
  editorUrl: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  error: string;
  busy: boolean;
  busyMessage: string;
}

export default function DesignEditorFrame({ backHref, editorUrl, iframeRef, error, busy, busyMessage }: DesignEditorFrameProps) {
  return (
    <>
      {busy && <GhostLoader fullscreen size="lg" message={busyMessage} />}
      <div className={`space-y-4 ${busy ? 'hidden' : ''}`}>
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
          <Link href={backHref} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">← Back</Link>
          <div className="hidden sm:block"><WizardSteps current="design" /></div>
          <div className="w-[72px] shrink-0" aria-hidden />
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-600">{error}</p>}
        <div className="rounded-2xl border border-border overflow-hidden bg-white" style={{ height: 'calc(100vh - 170px)' }}>
          {editorUrl ? <iframe ref={iframeRef} src={editorUrl} className="w-full h-full border-0" title="Design Editor" />
            : !error && <GhostLoader size="md" message="Loading editor…" />}
        </div>
      </div>
    </>
  );
}
