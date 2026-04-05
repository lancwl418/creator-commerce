import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/recruitment - Add a candidate
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Get admin user id
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('recruitment_candidates')
    .insert({
      platform: body.platform || 'instagram',
      platform_user_id: body.platform_user_id,
      platform_username: body.platform_username,
      profile_url: body.profile_url,
      avatar_url: body.avatar_url,
      display_name: body.display_name,
      bio: body.bio,
      email: body.email,
      followers_count: body.followers_count,
      following_count: body.following_count,
      posts_count: body.posts_count,
      engagement_rate: body.engagement_rate,
      status: 'discovered',
      added_by: adminUser?.id,
      tags: body.tags || [],
      notes: body.notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
