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

type SearchMode = 'username' | 'hashtag' | 'keyword';

interface IGUser {
  id: string;
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  following_count: number;
  media_count: number;
  profile_picture_url: string | null;
  website?: string;
  category?: string | null;
  is_verified?: boolean;
  is_business?: boolean;
  is_professional?: boolean;
  is_private?: boolean;
  engagement_rate?: number;
  bio_links?: { title: string; url: string }[];
  recent_media?: {
    type: string;
    url: string;
    caption: string;
    timestamp: string | null;
    likes: number;
    comments: number;
    shortcode?: string;
  }[];
}

interface HashtagResult {
  name: string;
  media_count: number;
}

interface SearchUser {
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_verified: boolean;
  id: string;
}

interface HashtagPost {
  shortcode: string;
  display_url: string;
  thumbnail_src?: string;
  is_video: boolean;
  likes: number;
  comments: number;
  caption: string;
  timestamp: string | null;
  owner_id: string;
  alt: string | null;
}

const MODES: { key: SearchMode; label: string; placeholder: string; prefix: string }[] = [
  { key: 'username', label: 'Username', placeholder: 'instagram_username', prefix: '@' },
  { key: 'hashtag', label: 'Hashtag', placeholder: 'streetart, illustration...', prefix: '#' },
  { key: 'keyword', label: 'Keyword', placeholder: 'Search candidates by bio, name, tags...', prefix: '' },
];

export function InstagramSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>('username');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Username search state
  const [userResult, setUserResult] = useState<IGUser | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savedUser, setSavedUser] = useState(false);

  // Hashtag/Keyword search state
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [relatedHashtags, setRelatedHashtags] = useState<HashtagResult[]>([]);
  const [topPosts, setTopPosts] = useState<HashtagPost[]>([]);
  const [recentPosts, setRecentPosts] = useState<HashtagPost[]>([]);
  const [totalMediaCount, setTotalMediaCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingUsername, setSavingUsername] = useState<string | null>(null);
  const [savedUsernames, setSavedUsernames] = useState<Set<string>>(new Set());

  // Keyword search state
  const [keywordResults, setKeywordResults] = useState<{
    id: string;
    display_name: string;
    platform_username: string;
    bio: string | null;
    followers_count: number | null;
    status: string;
    avatar_url: string | null;
    tags: string[];
  }[]>([]);

  function resetResults() {
    setUserResult(null);
    setSearchUsers([]);
    setRelatedHashtags([]);
    setTopPosts([]);
    setRecentPosts([]);
    setTotalMediaCount(0);
    setHasNextPage(false);
    setEndCursor(null);
    setCurrentPage(1);
    setKeywordResults([]);
    setSavedUser(false);
    setSavedUsernames(new Set());
    setError('');
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError('');
    resetResults();

    try {
      if (mode === 'username') {
        const res = await fetch(`/api/instagram/search?username=${encodeURIComponent(q.replace('@', ''))}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to fetch'); return; }
        setUserResult(data.user);
      } else if (mode === 'hashtag') {
        const res = await fetch(`/api/instagram/hashtag?tag=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Search failed'); return; }
        setSearchUsers(data.users || []);
        setRelatedHashtags(data.hashtags || []);
        setTopPosts(data.top_posts || []);
        setRecentPosts(data.recent_posts || []);
        setTotalMediaCount(data.total_media_count || 0);
        setHasNextPage(data.has_next_page || false);
        setEndCursor(data.end_cursor || null);
        setCurrentPage(1);
      } else {
        // Keyword: search existing candidates in DB + Instagram
        const [localRes, igRes] = await Promise.all([
          fetch(`/api/recruitment/search?q=${encodeURIComponent(q)}`),
          fetch(`/api/instagram/hashtag?tag=${encodeURIComponent(q)}`),
        ]);
        const localData = await localRes.json();
        if (localRes.ok) setKeywordResults(localData.results || []);

        const igData = await igRes.json();
        if (igRes.ok) {
          setSearchUsers(igData.users || []);
          setRelatedHashtags(igData.hashtags || []);
        }

        if ((localData.results || []).length === 0 && (igData.users || []).length === 0) {
          setError('No results found');
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function addUserCandidate() {
    if (!userResult) return;
    setSavingUser(true);
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          platform_user_id: userResult.id,
          platform_username: userResult.username,
          profile_url: `https://instagram.com/${userResult.username}`,
          avatar_url: userResult.profile_picture_url,
          display_name: userResult.name || userResult.username,
          bio: userResult.biography,
          followers_count: userResult.followers_count,
          following_count: userResult.following_count,
          posts_count: userResult.media_count,
          engagement_rate: userResult.engagement_rate,
          tags: [userResult.category].filter(Boolean),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return; }
      setSavedUser(true);
      router.refresh();
    } catch { setError('Failed to save candidate'); }
    finally { setSavingUser(false); }
  }

  async function addSearchUser(searchUser: SearchUser) {
    setSavingUsername(searchUser.username);
    try {
      // Fetch full profile via /api/instagram/search
      const profileRes = await fetch(`/api/instagram/search?username=${encodeURIComponent(searchUser.username)}`);
      const profileData = await profileRes.json();
      const profile = profileRes.ok ? profileData.user : null;

      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          platform_user_id: profile?.id || searchUser.id,
          platform_username: searchUser.username,
          profile_url: `https://instagram.com/${searchUser.username}`,
          avatar_url: profile?.profile_picture_url || searchUser.profile_pic_url,
          display_name: profile?.name || searchUser.full_name || searchUser.username,
          bio: profile?.biography || null,
          followers_count: profile?.followers_count || null,
          following_count: profile?.following_count || null,
          posts_count: profile?.media_count || null,
          engagement_rate: profile?.engagement_rate || null,
          tags: [profile?.category, query.trim()].filter(Boolean),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return; }
      setSavedUsernames(prev => new Set(prev).add(searchUser.username));
      router.refresh();
    } catch { setError('Failed to save'); }
    finally { setSavingUsername(null); }
  }

  async function loadPage(cursor: string | null) {
    if (!query.trim()) return;
    setLoadingMore(true);
    setError('');
    try {
      let url = `/api/instagram/hashtag?tag=${encodeURIComponent(query.trim())}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load'); return; }
      setRecentPosts(data.recent_posts || []);
      setHasNextPage(data.has_next_page || false);
      setEndCursor(data.end_cursor || null);
      // Keep top_posts only on first page
      if (!cursor) {
        setTopPosts(data.top_posts || []);
        setCurrentPage(1);
      } else {
        setTopPosts([]);
        setCurrentPage(prev => prev + 1);
      }
    } catch { setError('Failed to load page'); }
    finally { setLoadingMore(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Instagram Discovery</h2>
            <p className="text-xs text-gray-500">Find creators by username, hashtag, or search existing candidates</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Mode Tabs */}
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1 w-fit mb-4">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); resetResults(); setQuery(''); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === m.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1 max-w-lg">
            {MODES.find(m => m.key === mode)!.prefix && (
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {MODES.find(m => m.key === mode)!.prefix}
              </span>
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={MODES.find(m => m.key === mode)!.placeholder}
              className={`w-full rounded-xl border border-border bg-white pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all ${
                MODES.find(m => m.key === mode)!.prefix ? 'pl-8' : 'pl-4'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {mode === 'hashtag' && (
          <p className="text-xs text-gray-400 mt-2">
            Separate multiple hashtags with commas: streetart, illustration, digitalart
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-danger-50 border border-red-200 px-4 py-2.5">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        {/* ========== Username Result ========== */}
        {mode === 'username' && userResult && (
          <div className="mt-6 rounded-xl border border-border-light bg-surface-secondary p-5">
            {/* Private account warning */}
            {userResult.is_private && (
              <div className="mb-4 rounded-lg bg-warning-50 border border-yellow-200 px-4 py-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-warning-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <p className="text-sm text-warning-600">This is a private account</p>
              </div>
            )}

            <div className="flex items-start gap-4">
              <a href={`https://instagram.com/${userResult.username}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {userResult.profile_picture_url ? (
                  <img src={igProxy(userResult.profile_picture_url)} alt={userResult.username} className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-xl font-bold text-purple-600">
                    {userResult.username[0]?.toUpperCase()}
                  </div>
                )}
              </a>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`https://instagram.com/${userResult.username}`} target="_blank" rel="noopener noreferrer"
                    className="text-base font-semibold text-gray-900 hover:text-pink-600 transition-colors">
                    {userResult.name || userResult.username}
                  </a>
                  {userResult.is_verified && (
                    <svg className="w-4.5 h-4.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm text-gray-400">@{userResult.username}</span>
                  {userResult.category && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-medium">
                      {userResult.category}
                    </span>
                  )}
                  {(userResult.is_business || userResult.is_professional) && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 font-medium">
                      {userResult.is_business ? 'Business' : 'Professional'}
                    </span>
                  )}
                </div>
                {userResult.biography && (
                  <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-line line-clamp-3">{userResult.biography}</p>
                )}
                <div className="flex gap-6 mt-3">
                  <MetricItem value={fmt(userResult.followers_count)} label="Followers" />
                  <MetricItem value={fmt(userResult.following_count)} label="Following" />
                  <MetricItem value={fmt(userResult.media_count)} label="Posts" />
                  {userResult.engagement_rate !== undefined && userResult.engagement_rate > 0 && (
                    <MetricItem value={`${(userResult.engagement_rate * 100).toFixed(2)}%`} label="Eng. Rate" />
                  )}
                </div>

                {/* Bio Links */}
                {userResult.bio_links && userResult.bio_links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {userResult.bio_links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        {link.title || new URL(link.url).hostname}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {savedUser ? (
                  <AddedBadge />
                ) : (
                  <button onClick={addUserCandidate} disabled={savingUser}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 disabled:opacity-50 transition-colors">
                    {savingUser ? 'Adding...' : 'Add to Candidates'}
                  </button>
                )}
              </div>
            </div>

            {/* Recent Media Grid */}
            {userResult.recent_media && userResult.recent_media.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-light">
                <p className="text-xs font-medium text-gray-400 mb-3">Recent Posts</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {userResult.recent_media.map((media, i) => (
                    <a
                      key={i}
                      href={media.shortcode ? `https://instagram.com/p/${media.shortcode}` : '#'}
                      target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group"
                    >
                      {media.url ? (
                        <img src={igProxy(media.url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{media.type}</div>
                      )}
                      {/* Hover overlay with likes/comments */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                          {fmt(media.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                          {fmt(media.comments)}
                        </span>
                      </div>
                      {media.type === 'VIDEO' && (
                        <div className="absolute top-1.5 right-1.5">
                          <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== Hashtag Results ========== */}
        {mode === 'hashtag' && (topPosts.length > 0 || searchUsers.length > 0 || relatedHashtags.length > 0) && (
          <div className="mt-6 space-y-5">
            {/* Related Hashtags */}
            {relatedHashtags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Related Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {relatedHashtags.slice(0, 12).map((h) => (
                    <button
                      key={h.name}
                      onClick={() => { setQuery(h.name); resetResults(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors"
                    >
                      #{h.name}
                      <span className="text-purple-400">{fmt(h.media_count)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related Users */}
            {searchUsers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Related Accounts</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {searchUsers.slice(0, 10).map((u) => (
                    <div key={u.username} className="flex flex-col items-center gap-1.5 shrink-0 w-20">
                      <a href={`https://instagram.com/${u.username}`} target="_blank" rel="noopener noreferrer">
                        {u.profile_pic_url ? (
                          <img src={igProxy(u.profile_pic_url)} alt={u.username} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg font-bold text-purple-600">
                            {u.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </a>
                      <p className="text-[11px] text-gray-600 truncate w-full text-center">
                        {u.is_verified && '✓ '}{u.username}
                      </p>
                      {savedUsernames.has(u.username) ? (
                        <span className="text-[10px] text-success-600">Added</span>
                      ) : (
                        <button
                          onClick={() => addSearchUser(u)}
                          disabled={savingUsername === u.username}
                          className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary-600 font-medium hover:bg-primary-100 disabled:opacity-50"
                        >
                          {savingUsername === u.username ? '...' : 'Add'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Posts Grid */}
            {topPosts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">
                  Top Posts
                  {totalMediaCount > 0 && <span className="text-gray-300 ml-1">({fmt(totalMediaCount)} total)</span>}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {topPosts.map((post) => (
                    <PostCard key={post.shortcode} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Posts Grid */}
            {recentPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-400">
                    Recent Posts
                    {totalMediaCount > 0 && <span className="text-gray-300 ml-1">({fmt(totalMediaCount)} total)</span>}
                    {currentPage > 1 && <span className="text-gray-300 ml-1">- Page {currentPage}</span>}
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {recentPosts.map((post) => (
                    <PostCard key={post.shortcode} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border-light">
                  {currentPage > 1 && (
                    <button
                      onClick={() => { resetResults(); handleSearch(new Event('submit') as unknown as React.FormEvent); }}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                      First Page
                    </button>
                  )}
                  <span className="text-sm text-gray-400">Page {currentPage}</span>
                  {hasNextPage && (
                    <button
                      onClick={() => loadPage(endCursor)}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Next Page
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-2">
              See a creator you like? Copy their username and use the <strong>Username</strong> tab to look up their full profile and add them.
            </p>
          </div>
        )}

        {/* ========== Keyword: IG search results ========== */}
        {mode === 'keyword' && searchUsers.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Instagram results for &ldquo;{query}&rdquo;
            </p>
            <div className="rounded-xl border border-border-light overflow-hidden divide-y divide-border-light">
              {searchUsers.map((u) => (
                <div key={u.username} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors">
                  <a href={`https://instagram.com/${u.username}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {u.profile_pic_url ? (
                      <img src={igProxy(u.profile_pic_url)} alt={u.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-sm font-bold text-purple-600">
                        {u.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </a>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={`https://instagram.com/${u.username}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:text-pink-600 transition-colors">
                        {u.full_name || u.username}
                      </a>
                      {u.is_verified && (
                        <svg className="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-xs text-gray-400">@{u.username}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {savedUsernames.has(u.username) ? (
                      <AddedBadge />
                    ) : (
                      <button
                        onClick={() => addSearchUser(u)}
                        disabled={savingUsername === u.username}
                        className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 disabled:opacity-50 transition-colors"
                      >
                        {savingUsername === u.username ? 'Fetching...' : 'Add'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== Keyword: Local DB Results ========== */}
        {mode === 'keyword' && keywordResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Found <span className="font-bold">{keywordResults.length}</span> matching candidates
            </p>
            <div className="rounded-xl border border-border-light overflow-hidden divide-y divide-border-light">
              {keywordResults.map((candidate) => (
                <a
                  key={candidate.id}
                  href={`https://instagram.com/${candidate.platform_username}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors"
                >
                  {candidate.avatar_url ? (
                    <img src={igProxy(candidate.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shrink-0">
                      {candidate.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{candidate.display_name}</p>
                      <span className="text-xs text-gray-400">@{candidate.platform_username}</span>
                    </div>
                    {candidate.bio && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{candidate.bio}</p>
                    )}
                    {candidate.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {candidate.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {candidate.followers_count != null && (
                    <div className="text-center shrink-0">
                      <p className="text-sm font-medium text-gray-900">{fmt(candidate.followers_count)}</p>
                      <p className="text-[10px] text-gray-400">Followers</p>
                    </div>
                  )}
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                    candidate.status === 'shortlisted' ? 'bg-primary-50 text-primary-600' :
                    candidate.status === 'contacted' ? 'bg-warning-50 text-warning-600' :
                    candidate.status === 'interested' ? 'bg-emerald-50 text-emerald-600' :
                    candidate.status === 'registered' ? 'bg-success-50 text-success-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {candidate.status.replace('_', ' ')}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}

function PostCard({ post }: { post: HashtagPost }) {
  return (
    <a
      href={`https://instagram.com/p/${post.shortcode}`}
      target="_blank"
      rel="noopener noreferrer"
      className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group"
    >
      <img src={igProxy(post.display_url || post.thumbnail_src)} alt={post.alt || ''} className="w-full h-full object-cover" />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
          {post.likes > 0 ? fmt(post.likes) : '—'}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
          {post.comments}
        </span>
      </div>
      {post.is_video && (
        <div className="absolute top-1.5 right-1.5">
          <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </a>
  );
}

function AddedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 text-success-600 text-sm font-medium">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      Added
    </span>
  );
}
