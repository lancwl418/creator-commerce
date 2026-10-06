'use client';

import Link from 'next/link';
import type { WizardStep } from '@/lib/types/product';
import WizardSteps from './WizardSteps';

interface ProductEditorToolbarProps {
  step: WizardStep;
  saving: boolean;
  saved: boolean;
  onStepChange: (step: WizardStep) => void;
  onSave: () => void;
  onPublish: () => void;
  onEdit: () => void;
}

export default function ProductEditorToolbar({
  step, saving, saved, onStepChange, onSave, onPublish, onEdit,
}: ProductEditorToolbarProps) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
      {step === 'detail' ? (
        <Link
          href="/dashboard/products"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
      ) : (
        <button
          onClick={() => onStepChange('detail')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to detail
        </button>
      )}

      <div className="hidden sm:block">
        <WizardSteps
          current={step}
          onStepClick={(s) => {
            if (s === 'design') { onEdit(); return; }
            onStepChange(s === 'price' ? 'price' : 'detail');
          }}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save as Draft'}
        </button>
        {step === 'detail' ? (
          <button
            onClick={() => onStepChange('price')}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Continue to Price
          </button>
        ) : (
          <button
            onClick={() => onPublish()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-600 transition-colors shadow-sm"
          >
            Publish
          </button>
        )}
      </div>
    </div>

  );
}
