import { createClient } from '@/lib/supabase/server';
import { InstagramSearch } from './InstagramSearch';
import { CandidateList } from './CandidateList';

const STATUS_ORDER = ['discovered', 'shortlisted', 'contacted', 'interested', 'registered', 'no_response', 'rejected'];

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('recruitment_candidates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: candidates } = await query;

  // Get counts by status
  const statusCounts: Record<string, number> = {};
  for (const s of STATUS_ORDER) {
    const { count } = await supabase
      .from('recruitment_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', s);
    statusCounts[s] = count ?? 0;
  }

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creator Recruitment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover and recruit creators from Instagram and other platforms
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-white rounded-xl border border-border-light p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{statusCounts[s]}</p>
            <p className="text-[11px] text-gray-400 capitalize mt-0.5">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {/* Instagram Search */}
      <InstagramSearch />

      {/* Candidate List */}
      <CandidateList
        candidates={candidates || []}
        currentStatus={status || 'all'}
        totalCount={totalCount}
        statusCounts={statusCounts}
      />
    </div>
  );
}
