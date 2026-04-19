import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from('creators')
    .select('*, creator_profiles(*)')
    .eq('auth_user_id', user!.id)
    .single();

  const displayName = creator?.creator_profiles?.display_name || creator?.email;

  // Fetch counts
  const { count: designCount } = await supabase
    .from('designs')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creator!.id);

  const { count: productCount } = await supabase
    .from('sellable_product_instances')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creator!.id);

  // Orders and revenue
  const { data: orders } = await supabase
    .from('creator_orders')
    .select(`
      id, total_price,
      creator_store_connections (platform, store_name),
      creator_order_items (earnings_amount)
    `)
    .eq('creator_id', creator!.id);

  const totalOrders = orders?.length ?? 0;

  // Calculate revenue by source
  let storeRevenue = 0;
  let storeEarnings = 0;
  for (const order of orders || []) {
    const orderTotal = Number(order.total_price) || 0;
    const orderEarnings = (order.creator_order_items || []).reduce(
      (s: number, i: { earnings_amount: number | null }) => s + (i.earnings_amount || 0), 0
    );
    storeRevenue += orderTotal;
    storeEarnings += orderEarnings;
  }

  // Recommended products from ERP (fetch a few for display)
  let recommendedProducts: { id: string; name: string; image: string | null; price: number }[] = [];
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/erp/products?limit=8`,
      { next: { revalidate: 3600 } },
    );
    if (res.ok) {
      const data = await res.json();
      const records = (data.products || data.result?.records || []).slice(0, 8);
      recommendedProducts = records.map((p: {
        id: string;
        itemCnName?: string;
        title?: string;
        mainPic?: string;
        prodImageList?: { picSrc: string; isMain: number }[];
        prodSkuList?: { price: number }[];
      }) => {
        const mainImg = p.mainPic || p.prodImageList?.find(i => i.isMain === 1)?.picSrc || p.prodImageList?.[0]?.picSrc;
        return {
          id: p.id,
          name: p.itemCnName || p.title || 'Product',
          image: mainImg ? `/api/erp/image?path=${encodeURIComponent(mainImg)}` : null,
          price: p.prodSkuList?.[0]?.price ?? 0,
        };
      });
    }
  } catch { /* ERP unavailable, skip recommendations */ }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your creator dashboard</p>
      </div>

      {/* Stats Row 1: Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <Link href="/dashboard/designs" className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
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

        <Link href="/dashboard/products" className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Created Products</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{productCount ?? 0}</p>
        </Link>

        <Link href="/dashboard/orders" className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Total Orders</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{totalOrders}</p>
        </Link>

        <Link href="/dashboard/orders" className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Total Earnings</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
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
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-xs">No image</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate text-gray-900">{product.name}</p>
                {product.price > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">From ${product.price.toFixed(2)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
