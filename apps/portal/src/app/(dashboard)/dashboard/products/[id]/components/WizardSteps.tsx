'use client';

export type WizardStep = 'product' | 'design' | 'detail' | 'price';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'product', label: 'Product' },
  { key: 'design', label: 'Design' },
  { key: 'detail', label: 'Detail' },
  { key: 'price', label: 'Price' },
];

interface WizardStepsProps {
  current: WizardStep;
  /** Steps the user can click to jump back to. */
  onStepClick?: (step: WizardStep) => void;
}

export default function WizardSteps({ current, onStepClick }: WizardStepsProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const clickable = onStepClick && i <= currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick!(step.key)}
              className={`flex items-center gap-2 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-gray-900 text-white'
                    : active
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-300 bg-white text-gray-400'
                }`}
              >
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`text-sm font-semibold ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-6 sm:w-10 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}
