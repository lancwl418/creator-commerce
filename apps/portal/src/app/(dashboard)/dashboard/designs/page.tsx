import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DesignsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user!.id)
    .single();

  const { data: designs } = await supabase
    .from('designs')
    .select(`
      *,
      design_versions!design_versions_design_id_fkey (
        id,
        version_number,
        design_assets (
          id,
          asset_type,
          file_url,
          file_name
        )
      )
    `)
    .eq('creator_id', creator!.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designs</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your artwork and designs</p>
        </div>
        <Link
          href="/dashboard/designs/new"
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
        >
          Upload Design
        </Link>
      </div>

      {!designs || designs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {designs.map((design) => {
            const latestVersion = design.design_versions
              ?.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0];
            const artwork = latestVersion?.design_assets?.find(
              (a: { asset_type: string }) => a.asset_type === 'artwork'
            );

            return (
              <Link
                key={design.id}
                href={`/dashboard/designs/${design.id}`}
                className="group rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {artwork ? (
                    <img
                      src={artwork.file_url}
                      alt={design.title}
                      className="w-full h-full object-contain p-6"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">No preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate transition-colors">
                    {design.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2.5">
                    <StatusBadge status={design.status} />
                    <span className="text-xs text-gray-400 font-medium">
                      v{latestVersion?.version_number ?? 1}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    published: 'bg-blue-50 text-blue-700 border border-blue-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status] || styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
