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
      design_versions (
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
          <h2 className="text-2xl font-bold">Designs</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your artwork and designs</p>
        </div>
        <Link
          href="/dashboard/designs/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Upload Design
        </Link>
      </div>

      {!designs || designs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-4">No designs yet. Upload your first artwork to get started.</p>
          <Link
            href="/dashboard/designs/new"
            className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Upload Design
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="group rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {artwork ? (
                    <img
                      src={artwork.file_url}
                      alt={design.title}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">No preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 group-hover:text-black truncate">
                    {design.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge status={design.status} />
                    <span className="text-xs text-gray-400">
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
    pending_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    published: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
