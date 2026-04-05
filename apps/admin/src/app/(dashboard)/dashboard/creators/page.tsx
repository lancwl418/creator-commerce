import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CreatorFilters } from './CreatorFilters';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning-50 text-warning-600',
  active: 'bg-success-50 text-success-600',
  suspended: 'bg-danger-50 text-danger-600',
  banned: 'bg-gray-100 text-gray-600',
};

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('creators')
    .select('id, email, status, created_at, erp_partner_id, creator_profiles(display_name, avatar_url, country)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`email.ilike.%${q}%`);
  }

  const { data: creators } = await query;

  // Get counts per status
  const [
    { count: allCount },
    { count: pendingCount },
    { count: activeCount },
    { count: suspendedCount },
  ] = await Promise.all([
    supabase.from('creators').select('*', { count: 'exact', head: true }),
    supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
  ]);

  const tabs = [
    { key: 'all', label: 'All', count: allCount ?? 0 },
    { key: 'pending', label: 'Pending', count: pendingCount ?? 0 },
    { key: 'active', label: 'Active', count: activeCount ?? 0 },
    { key: 'suspended', label: 'Suspended', count: suspendedCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creators</h1>
          <p className="text-sm text-gray-500 mt-1">Manage creator accounts and applications</p>
        </div>
        <Link
          href="/dashboard/recruitment"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
          Recruit Creators
        </Link>
      </div>

      {/* Filters */}
      <CreatorFilters tabs={tabs} currentStatus={status || 'all'} currentQuery={q || ''} />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creator</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ERP Partner</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {(!creators || creators.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <p className="text-sm text-gray-400">No creators found</p>
                </td>
              </tr>
            ) : (
              creators.map((creator) => {
                const profile = Array.isArray(creator.creator_profiles)
                  ? creator.creator_profiles[0]
                  : creator.creator_profiles;
                return (
                  <tr key={creator.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/dashboard/creators/${creator.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 shrink-0">
                          {(profile?.display_name || creator.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate hover:text-primary-600 transition-colors">
                            {profile?.display_name || 'No name'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{creator.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[creator.status] || 'bg-gray-100 text-gray-600'}`}>
                        {creator.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">
                      {profile?.country || '-'}
                    </td>
                    <td className="px-6 py-3.5">
                      {creator.erp_partner_id ? (
                        <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                          {creator.erp_partner_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-400">
                      {new Date(creator.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
