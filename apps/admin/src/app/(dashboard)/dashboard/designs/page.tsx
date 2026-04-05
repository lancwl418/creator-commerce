import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DesignFilters } from './DesignFilters';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending_review: 'bg-warning-50 text-warning-600',
  approved: 'bg-blue-50 text-blue-600',
  published: 'bg-success-50 text-success-600',
  rejected: 'bg-danger-50 text-danger-600',
  archived: 'bg-gray-100 text-gray-400',
};

export default async function DesignReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  // Default to showing pending_review
  const filterStatus = status || 'pending_review';

  let query = supabase
    .from('designs')
    .select(`
      id, title, status, category, created_at, updated_at, creator_id,
      creators(email, creator_profiles(display_name, avatar_url, social_links)),
      design_versions!design_versions_design_id_fkey(
        id, version_number,
        design_assets(id, asset_type, file_url)
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data: designs } = await query;

  // Counts
  const [
    { count: allCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: publishedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from('designs').select('*', { count: 'exact', head: true }),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  const tabs = [
    { key: 'pending_review', label: 'Pending Review', count: pendingCount ?? 0 },
    { key: 'approved', label: 'Approved', count: approvedCount ?? 0 },
    { key: 'published', label: 'Published', count: publishedCount ?? 0 },
    { key: 'rejected', label: 'Rejected', count: rejectedCount ?? 0 },
    { key: 'all', label: 'All', count: allCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Design Review</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve creator designs for IdeaMax Marketplace</p>
      </div>

      {/* Pending alert */}
      {(pendingCount ?? 0) > 0 && filterStatus !== 'pending_review' && (
        <Link href="/dashboard/designs?status=pending_review"
          className="block rounded-xl bg-warning-50 border border-yellow-200 px-5 py-3">
          <p className="text-sm text-warning-600 font-medium">
            {pendingCount} design{pendingCount! > 1 ? 's' : ''} waiting for review
          </p>
        </Link>
      )}

      <DesignFilters tabs={tabs} currentStatus={filterStatus} currentQuery={q || ''} />

      {/* Design Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(!designs || designs.length === 0) ? (
          <div className="col-span-full bg-white rounded-2xl border border-border-light p-16 text-center">
            <p className="text-sm text-gray-400">No designs found</p>
          </div>
        ) : (
          designs.map((design) => {
            const creator = Array.isArray(design.creators) ? design.creators[0] : design.creators;
            const profile = creator?.creator_profiles;
            const profileData = Array.isArray(profile) ? profile[0] : profile;
            const versions = (design.design_versions as { version_number: number; design_assets: { asset_type: string; file_url: string }[] }[]) || [];
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0];
            const artwork = latestVersion?.design_assets?.find(a => a.asset_type === 'artwork');
            const igData = (profileData?.social_links as Record<string, unknown>)?.instagram as { username?: string } | undefined;

            return (
              <Link
                key={design.id}
                href={`/dashboard/designs/${design.id}`}
                className="group bg-white rounded-2xl border border-border-light overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* Preview */}
                <div className="aspect-square bg-surface-secondary flex items-center justify-center relative">
                  {artwork ? (
                    <img src={artwork.file_url} alt={design.title} className="w-full h-full object-contain p-4" />
                  ) : (
                    <span className="text-gray-300 text-sm">No preview</span>
                  )}
                  <span className={`absolute top-3 right-3 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[design.status] || 'bg-gray-100 text-gray-500'}`}>
                    {design.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {design.title}
                  </h3>

                  {/* Creator info */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                      {(profileData?.display_name || creator?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 truncate">{profileData?.display_name || 'No name'}</p>
                      {igData?.username && (
                        <p className="text-[10px] text-pink-500">@{igData.username}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2">
                    {new Date(design.updated_at || design.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
