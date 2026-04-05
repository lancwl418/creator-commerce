'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

function igProxy(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface Candidate {
  id: string;
  platform: string;
  platform_username: string;
  profile_url: string;
  avatar_url: string | null;
  display_name: string;
  bio: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  status: string;
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  discovered: 'bg-blue-50 text-blue-600',
  shortlisted: 'bg-primary-50 text-primary-600',
  contacted: 'bg-warning-50 text-warning-600',
  interested: 'bg-emerald-50 text-emerald-600',
  registered: 'bg-success-50 text-success-600',
  rejected: 'bg-gray-100 text-gray-500',
  no_response: 'bg-gray-100 text-gray-400',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  discovered: ['shortlisted', 'rejected'],
  shortlisted: ['contacted', 'rejected'],
  contacted: ['interested', 'no_response', 'rejected'],
  interested: ['registered', 'rejected'],
  no_response: ['contacted', 'rejected'],
};

export function CandidateList({
  candidates,
  currentStatus,
  totalCount,
  statusCounts,
}: {
  candidates: Candidate[];
  currentStatus: string;
  totalCount: number;
  statusCounts: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const tabs = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'discovered', label: 'Discovered', count: statusCounts.discovered || 0 },
    { key: 'shortlisted', label: 'Shortlisted', count: statusCounts.shortlisted || 0 },
    { key: 'contacted', label: 'Contacted', count: statusCounts.contacted || 0 },
    { key: 'interested', label: 'Interested', count: statusCounts.interested || 0 },
    { key: 'registered', label: 'Registered', count: statusCounts.registered || 0 },
  ];

  function navigate(status: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (status === 'all') sp.delete('status');
    else sp.set('status', status);
    startTransition(() => {
      router.push(`/dashboard/recruitment?${sp.toString()}`);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light">
        <h2 className="text-base font-semibold text-gray-900">Candidates</h2>
      </div>

      {/* Status Tabs */}
      <div className="px-6 py-3 border-b border-border-light overflow-x-auto">
        <div className="flex gap-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => navigate(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                currentStatus === tab.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${currentStatus === tab.key ? 'text-white/60' : 'text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border-light">
        {candidates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-gray-400">No candidates found</p>
            <p className="text-xs text-gray-300 mt-1">Use Instagram Discovery above to find creators</p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <CandidateRow key={candidate.id} candidate={candidate} />
          ))
        )}
      </div>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  function formatNumber(n: number | null) {
    if (n == null) return '-';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      await fetch(`/api/recruitment/${candidate.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  const nextStatuses = STATUS_TRANSITIONS[candidate.status] || [];

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-surface-hover transition-colors">
      {/* Avatar */}
      {candidate.avatar_url ? (
        <img
          src={igProxy(candidate.avatar_url)}
          alt={candidate.display_name}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shrink-0">
          {candidate.display_name?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{candidate.display_name}</p>
          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-pink-500 transition-colors"
          >
            @{candidate.platform_username}
          </a>
        </div>
        {candidate.bio && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{candidate.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex gap-5 shrink-0">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{formatNumber(candidate.followers_count)}</p>
          <p className="text-[10px] text-gray-400">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{formatNumber(candidate.posts_count)}</p>
          <p className="text-[10px] text-gray-400">Posts</p>
        </div>
        {candidate.engagement_rate != null && candidate.engagement_rate > 0 && (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {(candidate.engagement_rate * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-gray-400">Eng.</p>
          </div>
        )}
      </div>

      {/* Status */}
      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[candidate.status] || 'bg-gray-100 text-gray-500'}`}>
        {candidate.status.replace('_', ' ')}
      </span>

      {/* Actions */}
      {nextStatuses.length > 0 && (
        <div className="shrink-0 flex gap-1">
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={updating}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 ${
                s === 'rejected'
                  ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              {s === 'no_response' ? 'No Reply' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
