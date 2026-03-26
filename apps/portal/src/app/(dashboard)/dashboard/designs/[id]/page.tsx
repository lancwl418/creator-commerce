import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
      design_versions (
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
    pending_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    published: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/designs" className="hover:text-gray-700">Designs</Link>
        <span>/</span>
        <span className="text-gray-900">{design.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Artwork preview */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="aspect-square bg-gray-50 flex items-center justify-center">
              {artwork ? (
                <img
                  src={artwork.file_url}
                  alt={design.title}
                  className="max-w-full max-h-full object-contain p-8"
                />
              ) : (
                <span className="text-gray-400">No artwork</span>
              )}
            </div>
          </div>
        </div>

        {/* Details sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-xl font-bold mb-2">{design.title}</h2>

            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[design.status] || statusStyles.draft}`}>
                {design.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400">
                v{currentVersion?.version_number ?? 1}
              </span>
            </div>

            {design.description && (
              <p className="text-sm text-gray-600 mb-4">{design.description}</p>
            )}

            {design.design_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {design.design_tags.map((t: { id: string; tag: string }) => (
                  <span key={t.id} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                    {t.tag}
                  </span>
                ))}
              </div>
            )}

            {artwork && (
              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-3">
                <p>{artwork.width_px} x {artwork.height_px} px</p>
                {artwork.dpi && <p>{artwork.dpi} DPI</p>}
                <p>{artwork.file_name}</p>
                <p>{(artwork.file_size / 1024).toFixed(0)} KB</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Actions</h3>

            <Link
              href={`/dashboard/products/new?design_id=${design.id}`}
              className="block w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white text-center hover:bg-gray-800"
            >
              Create Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
