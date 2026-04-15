import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PromoteButton } from '../PromoteButton';

export default async function DesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from('designs')
    .select(`
      *,
      design_versions!design_versions_design_id_fkey (
        id,
        version_number,
        changelog,
        created_at,
        design_assets (
          id,
          asset_type,
          file_url,
          file_name,
          file_size,
          mime_type,
          width_px,
          height_px,
          dpi
        )
      ),
      design_tags (
        id,
        tag
      )
    `)
    .eq('id', id)
    .single();

  if (!design) notFound();

  const currentVersion = design.design_versions
    ?.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0];
  const artwork = currentVersion?.design_assets?.find(
    (a: { asset_type: string }) => a.asset_type === 'artwork'
  );

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    published: 'bg-blue-50 text-blue-700 border border-blue-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/designs" className="hover:text-primary-600 transition-colors">My Designs</Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium">{design.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Artwork preview */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="aspect-square bg-surface-secondary flex items-center justify-center">
              {artwork ? (
                <img
                  src={artwork.file_url}
                  alt={design.title}
                  className="max-w-full max-h-full object-contain p-10"
                />
              ) : (
                <span className="text-gray-400">No artwork</span>
              )}
            </div>
          </div>
        </div>

        {/* Details sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{design.title}</h2>

            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles[design.status] || statusStyles.draft}`}>
                {design.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                v{currentVersion?.version_number ?? 1}
              </span>
            </div>

            {design.description && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{design.description}</p>
            )}

            {design.design_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {design.design_tags.map((t: { id: string; tag: string }) => (
                  <span key={t.id} className="rounded-lg bg-surface-secondary px-2.5 py-1 text-xs text-gray-600 font-medium">
                    {t.tag}
                  </span>
                ))}
              </div>
            )}

            {artwork && (
              <div className="text-xs text-gray-400 space-y-1 border-t border-border-light pt-4 mt-4">
                <p className="font-medium text-gray-500">{artwork.width_px} x {artwork.height_px} px</p>
                {artwork.dpi && <p>{artwork.dpi} DPI</p>}
                <p>{artwork.file_name}</p>
                <p>{(artwork.file_size / 1024).toFixed(0)} KB</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Promote your design on our marketplace, or create your own product to sell on your store.
            </p>

            <PromoteButton designId={design.id} designStatus={design.status} />

            <Link
              href={`/dashboard/products/new?design_id=${design.id}`}
              className="block w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
            >
              Create Product
            </Link>
          </div>

          {/* Promotion Status */}
          {design.creator_expected_price && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-700">Expected Profit per Sale</p>
              <p className="text-lg font-bold text-amber-800 mt-0.5">${design.creator_expected_price}</p>
              <p className="text-[11px] text-amber-600 mt-1">
                70/30 split (you keep 70%)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
