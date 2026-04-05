import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalCreators },
    { count: pendingCreators },
    { count: totalDesigns },
    { count: pendingDesigns },
    { count: totalProducts },
    { count: activeListings },
  ] = await Promise.all([
    supabase.from('creators').select('*', { count: 'exact', head: true }),
    supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('designs').select('*', { count: 'exact', head: true }),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }),
    supabase.from('channel_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const stats = [
    { label: 'Total Creators', value: totalCreators ?? 0, sub: `${pendingCreators ?? 0} pending`, href: '/dashboard/creators', color: 'from-primary-500 to-primary-700' },
    { label: 'Designs', value: totalDesigns ?? 0, sub: `${pendingDesigns ?? 0} pending review`, href: '/dashboard/designs', color: 'from-violet-500 to-violet-700' },
    { label: 'Products', value: totalProducts ?? 0, sub: 'sellable instances', href: '/dashboard/products', color: 'from-emerald-500 to-emerald-700' },
    { label: 'Active Listings', value: activeListings ?? 0, sub: 'across channels', href: '/dashboard/channels', color: 'from-amber-500 to-amber-700' },
  ];

  // Recent pending creators
  const { data: recentPending } = await supabase
    .from('creators')
    .select('id, email, status, created_at, creator_profiles(display_name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of the Creator Commerce platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-lg transition-transform group-hover:scale-[1.02]`}>
              <p className="text-sm font-medium text-white/70">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-white/60 mt-1">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Creators */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Pending Creator Applications</h2>
            <p className="text-xs text-gray-500 mt-0.5">Creators waiting for approval</p>
          </div>
          <Link
            href="/dashboard/creators?status=pending"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border-light">
          {(!recentPending || recentPending.length === 0) ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">No pending applications</p>
            </div>
          ) : (
            recentPending.map((creator) => {
              const profile = Array.isArray(creator.creator_profiles)
                ? creator.creator_profiles[0]
                : creator.creator_profiles;
              return (
                <Link
                  key={creator.id}
                  href={`/dashboard/creators/${creator.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-hover transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 shrink-0">
                    {(profile?.display_name || creator.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.display_name || 'No name'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{creator.email}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(creator.created_at).toLocaleDateString()}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-50 text-warning-600">
                    Pending
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
