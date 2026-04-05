import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DesignReviewActions } from './DesignReviewActions';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending_review: 'bg-warning-50 text-warning-600 ring-warning-500/20',
  approved: 'bg-blue-50 text-blue-600 ring-blue-500/20',
  published: 'bg-success-50 text-success-600 ring-success-500/20',
  rejected: 'bg-danger-50 text-danger-600 ring-danger-500/20',
  archived: 'bg-gray-100 text-gray-400',
};

export default async function DesignReviewDetailPage({
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
      creators(
        id, email, status,
        creator_profiles(display_name, avatar_url, bio, social_links, country, slug)
      ),
      design_versions!design_versions_design_id_fkey(
        id, version_number, created_at,
        design_assets(id, asset_type, file_url, file_name, width_px, height_px, dpi, file_size)
      ),
      design_tags(tag)
    `)
    .eq('id', id)
    .single();

  if (!design) notFound();

  const creator = Array.isArray(design.creators) ? design.creators[0] : design.creators;
  const profile = Array.isArray(creator?.creator_profiles) ? creator.creator_profiles[0] : creator?.creator_profiles;
  const igData = (profile?.social_links as Record<string, unknown>)?.instagram as {
    username?: string; profile_picture_url?: string; followers_count?: number;
    biography?: string; category?: string; is_verified?: boolean;
  } | undefined;

  const versions = (design.design_versions as {
    id: string; version_number: number; created_at: string;
    design_assets: { id: string; asset_type: string; file_url: string; file_name: string; width_px: number; height_px: number; dpi: number; file_size: number }[];
  }[]) || [];
  const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0];
  const artwork = latestVersion?.design_assets?.find(a => a.asset_type === 'artwork');
  const tags = (design.design_tags as { tag: string }[])?.map(t => t.tag) || [];

  // Get existing products for this design
  const { data: products } = await supabase
    .from('sellable_product_instances')
    .select('id, title, status, retail_price, cost, channel_listings(id, channel_type, price, status)')
    .eq('design_id', id);

  // Get royalty config
  const { data: configData } = await supabase
    .from('operating_config')
    .select('config_value')
    .eq('config_key', 'royalty_rates')
    .single();
  const royaltyRates = (configData?.config_value as { standard?: number; premium?: number }) || { standard: 0.15 };

  return (
    <div className="space-y-6">
      {/* Back */}
      <a href="/dashboard/designs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Design Review
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Design Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{design.title}</h1>
                {design.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{design.description}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ring-1 ring-inset ${STATUS_STYLES[design.status] || 'bg-gray-100 text-gray-500'}`}>
                {design.status.replace('_', ' ')}
              </span>
            </div>
            <div className="bg-surface-secondary flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
              {artwork ? (
                <img src={artwork.file_url} alt={design.title} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />
              ) : (
                <p className="text-gray-400">No artwork uploaded</p>
              )}
            </div>
          </div>

          {/* File Info */}
          {artwork && (
            <div className="bg-white rounded-2xl border border-border-light shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">File Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoItem label="Dimensions" value={artwork.width_px && artwork.height_px ? `${artwork.width_px} × ${artwork.height_px}px` : '-'} />
                <InfoItem label="DPI" value={artwork.dpi ? `${artwork.dpi}` : '-'} />
                <InfoItem label="File Size" value={artwork.file_size ? `${(artwork.file_size / 1024 / 1024).toFixed(1)} MB` : '-'} />
                <InfoItem label="Version" value={`v${latestVersion?.version_number ?? 1}`} />
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-border-light shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-surface-secondary text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Existing Products */}
          {products && products.length > 0 && (
            <div className="bg-white rounded-2xl border border-border-light shadow-sm">
              <div className="px-5 py-4 border-b border-border-light">
                <h3 className="text-sm font-semibold text-gray-900">Products Using This Design</h3>
              </div>
              <div className="divide-y divide-border-light">
                {products.map(p => {
                  const listings = p.channel_listings as { id: string; channel_type: string; price: number; status: string }[] || [];
                  return (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-400">
                          Cost: ${p.cost?.toFixed(2) || '-'} · Retail: ${p.retail_price?.toFixed(2) || '-'}
                          {listings.length > 0 && ` · ${listings.length} listing${listings.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                        p.status === 'listed' ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
                      }`}>{p.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Creator Info + Actions */}
        <div className="space-y-6">
          {/* Creator Card */}
          <div className="bg-white rounded-2xl border border-border-light shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Creator</h3>
            <a href={`/dashboard/creators/${creator?.id}`} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-lg font-bold text-primary-600">
                {(profile?.display_name || creator?.email)?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {profile?.display_name || 'No name'}
                </p>
                <p className="text-xs text-gray-400">{creator?.email}</p>
                {profile?.country && (
                  <p className="text-xs text-gray-400">{profile.country}</p>
                )}
              </div>
            </a>

            {/* Instagram */}
            {igData?.username && (
              <div className="mt-4 pt-4 border-t border-border-light">
                <a href={`https://instagram.com/${igData.username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 group">
                  {igData.profile_picture_url ? (
                    <img src={`/api/proxy/image?url=${encodeURIComponent(igData.profile_picture_url)}`}
                      alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-sm font-bold text-purple-600">
                      {igData.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-pink-600 transition-colors">
                        @{igData.username}
                      </p>
                      {igData.is_verified && (
                        <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {igData.followers_count != null && (
                      <p className="text-[11px] text-gray-400">
                        {igData.followers_count >= 1000 ? `${(igData.followers_count / 1000).toFixed(1)}K` : igData.followers_count} followers
                        {igData.category && ` · ${igData.category}`}
                      </p>
                    )}
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Pricing & Royalty + Actions */}
          <DesignReviewActions
            designId={design.id}
            designStatus={design.status}
            creatorId={creator?.id || ''}
            creatorExpectedPrice={design.creator_expected_price ?? null}
            royaltyRates={royaltyRates}
            existingProducts={products || []}
          />

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-border-light shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</h3>
            <div className="space-y-3">
              <TimelineItem label="Created" date={design.created_at} />
              {design.updated_at !== design.created_at && (
                <TimelineItem label="Updated" date={design.updated_at} />
              )}
              {design.status === 'rejected' && design.rejection_reason && (
                <div className="rounded-lg bg-danger-50 border border-red-200 p-3 mt-2">
                  <p className="text-xs font-medium text-danger-600">Rejection reason:</p>
                  <p className="text-xs text-gray-600 mt-1">{design.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-gray-300" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-[11px] text-gray-400">{new Date(date).toLocaleString()}</p>
      </div>
    </div>
  );
}
