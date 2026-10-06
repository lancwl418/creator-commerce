interface CatalogSelectionBarProps {
  selectedCount: number;
  allSelected: boolean;
  busy: boolean;
  selectAll: () => void;
  clearSelection: () => void;
  handleDesignSelected: () => void;
}

export default function CatalogSelectionBar({ selectedCount, allSelected, busy, selectAll, clearSelection, handleDesignSelected }: CatalogSelectionBarProps) {
  return (
    <>
      {/* Sticky bottom bar when items selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] z-30 bg-white/95 backdrop-blur-md border-t border-border shadow-lg px-6 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold">
                {selectedCount}
              </span>
              <span className="text-sm text-gray-700 font-medium">
                product{selectedCount > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium ml-1"
              >
                {allSelected
                  ? 'Deselect all'
                  : 'Select all visible'}
              </button>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Clear
              </button>
            </div>
            <button
              disabled={busy}
              onClick={handleDesignSelected}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
            >
              Design & Create
            </button>
          </div>
        </div>
      )}
    </>
  );
}
