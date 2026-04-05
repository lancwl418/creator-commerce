import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CreatorActions } from './CreatorActions';
import { CreatorStats } from './CreatorStats';
import { LinkInstagram } from './LinkInstagram';
import { CreatorDesigns } from './CreatorDesigns';
import { CreatorProducts } from './CreatorProducts';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning-50 text-warning-600 ring-warning-500/20',
  active: 'bg-success-50 text-success-600 ring-success-500/20',
  suspended: 'bg-danger-50 text-danger-600 ring-danger-500/20',
  banned: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from('creators')
    .select('*, creator_profiles(*)')
    .eq('id', id)
    .single();

  if (!creator) notFound();

  const profile = Array.isArray(creator.creator_profiles)
    ? creator.creator_profiles[0]
    : creator.creator_profiles;

  // Get stats
  const [
    { count: designCount },
    { count: productCount },
    { count: listingCount },
  ] = await Promise.all([
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('creator_id', id),
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }).eq('creator_id', id),
    supabase.from('channel_listings').select('*', { count: 'exact', head: true })
      .in('sellable_product_instance_id',
        (await supabase.from('sellable_product_instances').select('id').eq('creator_id', id)).data?.map(p => p.id) || []
      ),
  ]);

  // Get store connections
  const { data: storeConnections } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('creator_id', id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <a
        href="/dashboard/creators"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Creators
      </a>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-2xl font-bold text-primary-600">
              {(profile?.display_name || creator.email)?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {profile?.display_name || 'No name'}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[creator.status] || 'bg-gray-100 text-gray-600'}`}>
                  {creator.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{creator.email}</p>
              {profile?.bio && (
                <p className="text-sm text-gray-400 mt-1 max-w-lg">{profile.bio}</p>
              )}
            </div>
          </div>
          <CreatorActions creatorId={creator.id} currentStatus={creator.status} />
        </div>

        {/* Meta info */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoItem label="Joined" value={new Date(creator.created_at).toLocaleDateString()} />
          <InfoItem label="Country" value={profile?.country || '-'} />
          <InfoItem label="Slug" value={profile?.slug || '-'} />
          <InfoItem label="ERP Partner ID" value={creator.erp_partner_id ? creator.erp_partner_id.slice(0, 12) + '...' : 'Not linked'} />
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Designs" value={designCount ?? 0} />
        <StatCard label="Products" value={productCount ?? 0} />
        <StatCard label="Listings" value={listingCount ?? 0} />
      </div>

      {/* Instagram Link */}
      <LinkInstagram
        creatorId={creator.id}
        linkedInstagram={(profile?.social_links as Record<string, unknown>)?.instagram as {
          username: string; user_id?: string; followers_count?: number; following_count?: number;
          media_count?: number; biography?: string; profile_picture_url?: string;
          category?: string; is_verified?: boolean; linked_at?: string;
        } | null || null}
      />

      {/* Financial Stats */}
      <CreatorStats creatorId={creator.id} />

      {/* Designs & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreatorDesigns creatorId={creator.id} totalCount={designCount ?? 0} />
        <CreatorProducts creatorId={creator.id} totalCount={productCount ?? 0} />
      </div>

      {/* Store Connections */}
      {storeConnections && storeConnections.length > 0 && (
        <div className="bg-white rounded-2xl border border-border-light shadow-sm">
          <div className="px-6 py-4 border-b border-border-light">
            <h2 className="text-base font-semibold text-gray-900">Store Connections</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {storeConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-700">
                        {conn.platform.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{conn.store_name || conn.platform}</p>
                      <p className="text-xs text-gray-400">{conn.store_url}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    conn.status === 'connected' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                  }`}>
                    {conn.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {profile?.social_links && Object.keys(profile.social_links).length > 0 && (
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Social Links</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(profile.social_links as Record<string, string>).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <span className="capitalize">{platform}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5 font-mono">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-border-light p-4">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
