const PLACEHOLDER_CARDS = 10;

export default function CatalogProductsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-pulse" aria-busy="true">
      <div className="h-8 w-40 rounded-lg bg-gray-200" />
      <div className="h-4 w-24 rounded bg-gray-200 mt-2" />
      <div className="h-10 rounded-xl bg-gray-200 mt-6 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <div key={index} className="rounded-2xl border-2 border-border bg-white overflow-hidden">
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
