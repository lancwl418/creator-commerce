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

  const { count: listedCount } = await supabase
    .from('sellable_product_instances')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creator!.id)
    .eq('status', 'listed');

  // Recent designs
  const { data: recentDesigns } = await supabase
    .from('designs')
    .select(`
      id, title, status, created_at,
      design_versions (
        id, version_number,
        design_assets (id, asset_type, file_url)
      )
    `)
    .eq('creator_id', creator!.id)
    .order('created_at', { ascending: false })
    .limit(4);

  const stats = [
    {
      label: 'Total Designs',
      value: designCount ?? 0,
      gradient: 'from-primary-500 to-primary-700',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Z" />
        </svg>
      ),
    },
    {
      label: 'Products',
      value: productCount ?? 0,
      gradient: 'from-violet-500 to-purple-700',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
    },
    {
      label: 'Listed',
      value: listedCount ?? 0,
      gradient: 'from-emerald-500 to-green-700',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your creator dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">{stat.label}</p>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Designs */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Recent Designs</h3>
        <Link href="/dashboard/designs" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
          View all
        </Link>
      </div>

      {!recentDesigns || recentDesigns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center bg-white">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">No designs yet. Upload your first artwork to get started.</p>
          <Link
            href="/dashboard/designs/new"
            className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Upload Design
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recentDesigns.map((design) => {
            const version = design.design_versions
              ?.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0];
            const artworkUrl = version?.design_assets?.find(
              (a: { asset_type: string }) => a.asset_type === 'artwork'
            )?.file_url;

            return (
              <Link
                key={design.id}
                href={`/dashboard/designs/${design.id}`}
                className="group rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {artworkUrl ? (
                    <img src={artworkUrl} alt={design.title} className="w-full h-full object-contain p-4" />
                  ) : (
                    <span className="text-gray-400 text-xs">No preview</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate text-gray-900">{design.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
