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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Welcome, {displayName}</h2>
      <p className="text-gray-500 mb-6">Here&apos;s your creator dashboard</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Designs</p>
          <p className="text-3xl font-bold mt-1">{designCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-3xl font-bold mt-1">{productCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Listed</p>
          <p className="text-3xl font-bold mt-1">{listedCount ?? 0}</p>
        </div>
      </div>

      {/* Recent Designs */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Designs</h3>
        <Link href="/dashboard/designs" className="text-sm text-gray-500 hover:text-gray-700">
          View all →
        </Link>
      </div>

      {!recentDesigns || recentDesigns.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500 mb-3">No designs yet. Upload your first artwork to get started.</p>
          <Link
            href="/dashboard/designs/new"
            className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
                className="group rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  {artworkUrl ? (
                    <img src={artworkUrl} alt={design.title} className="w-full h-full object-contain p-3" />
                  ) : (
                    <span className="text-gray-400 text-xs">No preview</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium truncate">{design.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
