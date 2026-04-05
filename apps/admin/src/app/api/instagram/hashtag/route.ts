import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'bb64496e28msh404e742bb7f1073p1b3d4cjsnaa39242a4d5e';
const RAPIDAPI_HOST = 'instagram-looter2.p.rapidapi.com';

/**
 * GET /api/instagram/hashtag?tag=streetart&cursor=xxx
 *
 * Uses RapidAPI "Instagram Looter" endpoints:
 * - /tag-feeds: Get top & recent posts for a hashtag (supports cursor pagination)
 * - /search: Get related users & hashtags by keyword (first page only)
 *
 * First request (no cursor): returns top_posts + recent_posts + users + hashtags
 * Subsequent requests (with cursor): returns only next page of recent_posts
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get('tag')?.replace(/^#/, '').trim();
  if (!tag) {
    return NextResponse.json({ error: 'tag parameter required' }, { status: 400 });
  }

  const cursor = request.nextUrl.searchParams.get('cursor');

  try {
    // Build tag-feeds URL with optional cursor
    let tagFeedsUrl = `https://${RAPIDAPI_HOST}/tag-feeds?query=${encodeURIComponent(tag)}`;
    if (cursor) {
      tagFeedsUrl += `&cursor=${encodeURIComponent(cursor)}`;
    }

    // First page: fetch tag-feeds + search in parallel
    // Subsequent pages: only fetch tag-feeds
    const fetches: Promise<Response>[] = [
      fetch(tagFeedsUrl, {
        headers: { 'Content-Type': 'application/json', 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEY },
      }),
    ];

    if (!cursor) {
      fetches.push(
        fetch(`https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(tag)}`, {
          headers: { 'Content-Type': 'application/json', 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEY },
        })
      );
    }

    const responses = await Promise.all(fetches);
    const tagData = await responses[0].json();
    const searchData = !cursor ? await responses[1].json() : null;

    // Parse tag-feeds
    const hashtag = tagData?.data?.hashtag;
    const mediaSection = hashtag?.edge_hashtag_to_media || {};
    const topPosts = !cursor ? (hashtag?.edge_hashtag_to_top_posts?.edges || []).map(mapPost) : [];
    const recentPosts = (mediaSection.edges || []).map(mapPost);
    const totalMediaCount = mediaSection.count || 0;

    // Pagination info
    const pageInfo = mediaSection.page_info || {};
    const hasNextPage = pageInfo.has_next_page || false;
    const endCursor = pageInfo.end_cursor || null;

    // Parse search (first page only)
    let users: { username: string; full_name: string; profile_pic_url: string; is_verified: boolean; id: string }[] = [];
    let hashtags: { name: string; media_count: number }[] = [];

    if (searchData) {
      users = (searchData.users || []).map((u: {
        user: { username: string; full_name: string; profile_pic_url: string; is_verified: boolean; pk: string; id: string }
      }) => ({
        username: u.user.username,
        full_name: u.user.full_name,
        profile_pic_url: u.user.profile_pic_url,
        is_verified: u.user.is_verified,
        id: u.user.pk || u.user.id,
      }));

      hashtags = (searchData.hashtags || []).map((h: {
        hashtag: { name: string; media_count: number }
      }) => ({
        name: h.hashtag.name,
        media_count: h.hashtag.media_count,
      }));
    }

    return NextResponse.json({
      source: 'rapidapi',
      query: tag,
      total_media_count: totalMediaCount,
      top_posts: topPosts,
      recent_posts: recentPosts,
      has_next_page: hasNextPage,
      end_cursor: endCursor,
      users,
      hashtags,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Search failed', detail: String(err) },
      { status: 500 }
    );
  }
}

interface PostEdge {
  node: {
    shortcode: string;
    display_url: string;
    thumbnail_src?: string;
    is_video: boolean;
    edge_liked_by?: { count: number };
    edge_media_preview_like?: { count: number };
    edge_media_to_comment?: { count: number };
    edge_media_to_caption?: { edges: { node: { text: string } }[] };
    taken_at_timestamp?: number;
    owner: { id: string };
    accessibility_caption?: string;
  };
}

function mapPost(edge: PostEdge) {
  const n = edge.node;
  const caption = n.edge_media_to_caption?.edges?.[0]?.node?.text || '';
  return {
    shortcode: n.shortcode,
    display_url: n.display_url,
    thumbnail_src: n.thumbnail_src,
    is_video: n.is_video,
    likes: Math.max(n.edge_liked_by?.count || 0, n.edge_media_preview_like?.count || 0),
    comments: n.edge_media_to_comment?.count || 0,
    caption: caption.slice(0, 200),
    timestamp: n.taken_at_timestamp ? new Date(n.taken_at_timestamp * 1000).toISOString() : null,
    owner_id: n.owner?.id,
    alt: n.accessibility_caption || null,
  };
}
