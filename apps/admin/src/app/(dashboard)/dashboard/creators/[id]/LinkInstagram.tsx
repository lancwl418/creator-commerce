'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function igProxy(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

interface IGProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  following_count: number;
  media_count: number;
  profile_picture_url: string | null;
  category: string | null;
  is_verified: boolean;
  is_professional: boolean;
  engagement_rate: number;
}

interface LinkedIG {
  username: string;
  user_id?: string;
  followers_count?: number;
  following_count?: number;
  media_count?: number;
  biography?: string;
  profile_picture_url?: string;
  category?: string;
  is_verified?: boolean;
  linked_at?: string;
}

export function LinkInstagram({
  creatorId,
  linkedInstagram,
}: {
  creatorId: string;
  linkedInstagram: LinkedIG | null;
}) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IGProfile | null>(null);
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/instagram/search?username=${encodeURIComponent(username.trim().replace('@', ''))}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Not found'); return; }
      setResult(data.user);
    } catch { setError('Search failed'); }
    finally { setLoading(false); }
  }

  async function handleLink() {
    if (!result) return;
    setLinking(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/link-instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: result.username,
          user_id: result.id,
          followers_count: result.followers_count,
          following_count: result.following_count,
          media_count: result.media_count,
          biography: result.biography,
          profile_picture_url: result.profile_picture_url,
          category: result.category,
          is_verified: result.is_verified,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      setShowSearch(false);
      setResult(null);
      setUsername('');
      router.refresh();
    } catch { setError('Failed to link'); }
    finally { setLinking(false); }
  }

  async function handleUnlink() {
    if (!confirm('Unlink Instagram account from this creator?')) return;
    setUnlinking(true);
    try {
      await fetch(`/api/admin/creators/${creatorId}/link-instagram`, { method: 'DELETE' });
      router.refresh();
    } finally { setUnlinking(false); }
  }

  // Already linked - show linked account
  if (linkedInstagram && !showSearch) {
    return (
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Instagram</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Change
            </button>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="text-xs text-gray-400 hover:text-danger-600 font-medium disabled:opacity-50"
            >
              {unlinking ? 'Unlinking...' : 'Unlink'}
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            {linkedInstagram.profile_picture_url ? (
              <a href={`https://instagram.com/${linkedInstagram.username}`} target="_blank" rel="noopener noreferrer">
                <img src={igProxy(linkedInstagram.profile_picture_url)} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-pink-100" />
              </a>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-lg font-bold text-purple-600">
                {linkedInstagram.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <a href={`https://instagram.com/${linkedInstagram.username}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-900 hover:text-pink-600 transition-colors">
                  @{linkedInstagram.username}
                </a>
                {linkedInstagram.is_verified && (
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                )}
                {linkedInstagram.category && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-medium">
                    {linkedInstagram.category}
                  </span>
                )}
              </div>
              {linkedInstagram.biography && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{linkedInstagram.biography}</p>
              )}
              <div className="flex gap-5 mt-2">
                {linkedInstagram.followers_count != null && (
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(linkedInstagram.followers_count)}</span>
                    <span className="text-[11px] text-gray-400 ml-1">followers</span>
                  </div>
                )}
                {linkedInstagram.following_count != null && (
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(linkedInstagram.following_count)}</span>
                    <span className="text-[11px] text-gray-400 ml-1">following</span>
                  </div>
                )}
                {linkedInstagram.media_count != null && (
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(linkedInstagram.media_count)}</span>
                    <span className="text-[11px] text-gray-400 ml-1">posts</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {linkedInstagram.linked_at && (
            <p className="text-[11px] text-gray-300 mt-3">
              Linked {new Date(linkedInstagram.linked_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Not linked or changing - show search
  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Instagram</h2>
        </div>
        {linkedInstagram && (
          <button onClick={() => { setShowSearch(false); setResult(null); }} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        )}
      </div>
      <div className="p-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="instagram_username"
              className="w-full rounded-xl border border-border bg-white pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-lg bg-danger-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-danger-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-xl border border-border-light bg-surface-secondary p-4">
            <div className="flex items-center gap-3">
              {result.profile_picture_url ? (
                <img src={igProxy(result.profile_picture_url)} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-lg font-bold text-purple-600">
                  {result.username[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{result.name || result.username}</p>
                  {result.is_verified && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-xs text-gray-400">@{result.username}</span>
                </div>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-xs text-gray-500"><strong>{fmt(result.followers_count)}</strong> followers</span>
                  <span className="text-xs text-gray-500"><strong>{fmt(result.media_count)}</strong> posts</span>
                  {result.engagement_rate > 0 && (
                    <span className="text-xs text-gray-500"><strong>{(result.engagement_rate * 100).toFixed(1)}%</strong> eng.</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLink}
                disabled={linking}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 disabled:opacity-50 transition-colors"
              >
                {linking ? 'Linking...' : 'Link Account'}
              </button>
            </div>
          </div>
        )}

        {!linkedInstagram && !result && !loading && (
          <p className="text-xs text-gray-400 mt-3">Search for an Instagram username to link to this creator</p>
        )}
      </div>
    </div>
  );
}
