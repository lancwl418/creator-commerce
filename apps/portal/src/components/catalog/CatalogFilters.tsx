interface CatalogFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (value: string) => void;
}

export default function CatalogFilters({ search, setSearch, categories, activeCategory, setActiveCategory }: CatalogFiltersProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
        />
      </div>

      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-border text-gray-600 hover:bg-gray-50'
                }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}
    </div>

  );
}
