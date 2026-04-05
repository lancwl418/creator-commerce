import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/creators
 * Body: { email, password, display_name? }
 *
 * Creates a new creator via Supabase Auth signup.
 * The DB trigger `handle_new_user` automatically creates
 * the `creators` and `creator_profiles` records.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, password, display_name } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Use Supabase Auth API to create the user
  // This will trigger the handle_new_user function which creates creators + creator_profiles
  const signupRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email,
        password,
        options: {
          data: {
            display_name: display_name || '',
          },
        },
      }),
    }
  );

  const signupData = await signupRes.json();

  if (!signupRes.ok || signupData.error) {
    return NextResponse.json(
      { error: signupData.error?.message || signupData.msg || 'Failed to create user' },
      { status: 400 }
    );
  }

  const newUserId = signupData.user?.id;
  if (!newUserId) {
    return NextResponse.json({ error: 'User created but no ID returned' }, { status: 500 });
  }

  // Update display_name in creator_profiles if provided
  if (display_name) {
    // Wait a moment for the trigger to create the records
    await new Promise(resolve => setTimeout(resolve, 500));

    await supabase
      .from('creator_profiles')
      .update({ display_name })
      .eq('creator_id', (
        await supabase.from('creators').select('id').eq('auth_user_id', newUserId).single()
      ).data?.id || '');
  }

  return NextResponse.json({
    success: true,
    user_id: newUserId,
    email,
  });
}
