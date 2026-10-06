import Link from 'next/link';
import Image from 'next/image';
import type { DashboardData } from '@/lib/types/dashboard';
import OnboardingSteps from './OnboardingSteps';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { displayName, designCount, publishedCount, totalOrders, storeRevenue, storeEarnings, ordersRequiringAction, recommendedProducts } = data;
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your creator dashboard</p>
      </div>

      {/* Onboarding steps */}
      <OnboardingSteps publishedCount={publishedCount ?? 0} />

      {/* Stats Row 1: Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <Link href="/dashboard/designs" className="rounded-2xl bg-ink p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Total Designs</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{designCount ?? 0}</p>
        </Link>

        <Link href="/dashboard/products?tab=published" className="rounded-2xl bg-ink p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Products published</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{publishedCount ?? 0}</p>
        </Link>

        <Link href="/dashboard/orders" className="rounded-2xl bg-ink p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Orders requiring action</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{ordersRequiringAction}</p>
        </Link>

        <Link href="/dashboard/orders" className="rounded-2xl bg-brand p-5 text-ink shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink/60">Profit</p>
            <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">${storeEarnings.toFixed(2)}</p>
        </Link>
      </div>

      {/* Revenue breakdown */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm mb-10">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Your Stores</span>
            </div>
            <p className="text-xl font-bold text-gray-900">${storeRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Revenue · {totalOrders} order{totalOrders !== 1 ? 's' : ''}</p>
            <p className="text-sm font-semibold text-emerald-600 mt-1">Earnings: ${storeEarnings.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-500"></div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Ideamax Platform</span>
            </div>
            <p className="text-xl font-bold text-gray-900">$0.00</p>
            <p className="text-xs text-gray-400 mt-0.5">Revenue · 0 orders</p>
            <p className="text-sm font-semibold text-emerald-600 mt-1">Royalties: $0.00</p>
          </div>
        </div>
      </div>

      {/* Recommended Products */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Products</h3>
        <Link href="/dashboard/catalog" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
          View Catalog
        </Link>
      </div>

      {recommendedProducts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center bg-white">
          <p className="text-gray-500 mb-4">No products available right now.</p>
          <Link
            href="/dashboard/catalog"
            className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recommendedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/dashboard/catalog/${product.id}`}
              className="group rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                {product.image ? (
                  <Image unoptimized width={320} height={320} src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-xs">No image</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate text-gray-900">{product.name}</p>
                {product.price != null && (
                  <p className="text-xs text-gray-500 mt-0.5">From {product.price == null ? 'Price unavailable' : `$${product.price.toFixed(2)}`}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
