interface CatalogDetailActionsProps {
  addedToPool: boolean;
  busy: boolean;
  error: string;
  handleStartDesigning: () => void;
  handleAddToDesignPool: () => void;
}

export default function CatalogDetailActions({ addedToPool, busy, error, handleStartDesigning, handleAddToDesignPool }: CatalogDetailActionsProps) {
  return (
    <div className="pt-2 space-y-3">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        onClick={handleStartDesigning}
        className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
      >
        Start Designing
      </button>
      <button
        onClick={handleAddToDesignPool}
        disabled={addedToPool}
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all ${addedToPool
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-white text-gray-700 border border-border hover:bg-gray-50 hover:border-gray-300'
          }`}
      >
        {addedToPool ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Added to Design Pool
          </span>
        ) : (
          'Add to Design Pool'
        )}
      </button>
    </div>
  );
}
