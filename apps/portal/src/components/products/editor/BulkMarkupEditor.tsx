'use client';

interface BulkMarkupEditorProps {
  markup: string;
  onChange: (value: string) => void;
  onApply: () => void;
}

export default function BulkMarkupEditor({ markup, onChange, onApply }: BulkMarkupEditorProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Set markup</label>
        <div className="relative w-28">
          <input
            type="number"
            min="0"
            value={markup}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-border pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
      </div>
      <button
        onClick={onApply}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Apply to all variants
      </button>
      <p className="text-[11px] text-gray-400 flex-1 min-w-[200px]">
        Sets every enabled variant&apos;s price to cost × (1 + markup%).
      </p>
    </div>

  );
}
