import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/creators/[id]/link-instagram
 * Body: { username, user_id, followers_count, following_count, media_count, biography, profile_picture_url, category, is_verified }
 *
 * Links an Instagram account to a creator by updating social_links in creator_profiles.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: creatorId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { username, user_id, followers_count, following_count, media_count, biography, profile_picture_url, category, is_verified } = body;

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  // Get current profile
  const { data: profile, error: fetchError } = await supabase
    .from('creator_profiles')
    .select('social_links')
    .eq('creator_id', creatorId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  // Merge Instagram data into social_links
  const socialLinks = (profile?.social_links as Record<string, unknown>) || {};
  socialLinks.instagram = {
    username,
    user_id,
    followers_count,
    following_count,
    media_count,
    biography,
    profile_picture_url,
    category,
    is_verified,
    linked_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('creator_profiles')
    .update({ social_links: socialLinks })
    .eq('creator_id', creatorId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/creators/[id]/link-instagram
 * Unlinks Instagram account from creator.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: creatorId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('social_links')
    .eq('creator_id', creatorId)
    .single();

  const socialLinks = (profile?.social_links as Record<string, unknown>) || {};
  delete socialLinks.instagram;

  const { error } = await supabase
    .from('creator_profiles')
    .update({ social_links: socialLinks })
    .eq('creator_id', creatorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
