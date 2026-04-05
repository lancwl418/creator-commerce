import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'bb64496e28msh404e742bb7f1073p1b3d4cjsnaa39242a4d5e';
const RAPIDAPI_HOST = 'instagram-looter2.p.rapidapi.com';

/**
 * GET /api/instagram/search?username=xxx
 *
 * Uses RapidAPI "Instagram Looter" to fetch user profile.
 * Endpoint: GET https://instagram-looter2.p.rapidapi.com/profile?username=xxx
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = request.nextUrl.searchParams.get('username')?.trim().replace('@', '');
  if (!username) {
    return NextResponse.json({ error: 'username parameter required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/profile?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.status || data.status === false) {
      return NextResponse.json(
        { error: data.message || 'User not found' },
        { status: 404 }
      );
    }

    // Extract media edges for recent posts + engagement calculation
    const mediaEdges = data.edge_owner_to_timeline_media?.edges || [];
    const followersCount = data.edge_followed_by?.count || 0;

    // Calculate engagement rate from recent posts
    let engagementRate = 0;
    if (mediaEdges.length > 0 && followersCount > 0) {
      const totalEngagement = mediaEdges.reduce((sum: number, edge: { node: { edge_media_preview_like?: { count: number }; edge_liked_by?: { count: number }; edge_media_to_comment?: { count: number } } }) => {
        const node = edge.node;
        const likes = Math.max(node.edge_media_preview_like?.count || 0, node.edge_liked_by?.count || 0, 0);
        const comments = node.edge_media_to_comment?.count || 0;
        return sum + likes + comments;
      }, 0);
      engagementRate = totalEngagement / mediaEdges.length / followersCount;
    }

    // Map recent media
    const recentMedia = mediaEdges.slice(0, 6).map((edge: {
      node: {
        display_url?: string;
        thumbnail_src?: string;
        is_video?: boolean;
        video_url?: string;
        edge_media_to_caption?: { edges: { node: { text: string } }[] };
        taken_at_timestamp?: number;
        edge_media_preview_like?: { count: number };
        edge_liked_by?: { count: number };
        edge_media_to_comment?: { count: number };
        shortcode?: string;
      }
    }) => {
      const node = edge.node;
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      return {
        type: node.is_video ? 'VIDEO' : 'IMAGE',
        url: node.display_url || node.thumbnail_src || null,
        caption: caption.slice(0, 200),
        timestamp: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null,
        likes: Math.max(node.edge_media_preview_like?.count || 0, node.edge_liked_by?.count || 0, 0),
        comments: node.edge_media_to_comment?.count || 0,
        shortcode: node.shortcode,
      };
    });

    // Extract bio links
    const bioLinks = (data.bio_links || []).map((link: { title: string; url: string }) => ({
      title: link.title,
      url: link.url,
    }));

    return NextResponse.json({
      source: 'rapidapi',
      user: {
        id: data.id,
        username: data.username,
        name: data.full_name,
        biography: data.biography,
        followers_count: followersCount,
        following_count: data.edge_follow?.count || 0,
        media_count: data.edge_owner_to_timeline_media?.count || 0,
        profile_picture_url: data.profile_pic_url_hd || data.profile_pic_url || null,
        website: data.external_url || null,
        category: data.category_name || null,
        is_verified: data.is_verified || false,
        is_business: data.is_business_account || false,
        is_professional: data.is_professional_account || false,
        is_private: data.is_private || false,
        engagement_rate: Math.round(engagementRate * 10000) / 10000,
        bio_links: bioLinks,
        recent_media: recentMedia,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch Instagram data', detail: String(err) },
      { status: 500 }
    );
  }
}
