import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/recruitment/search?q=keyword
 *
 * Search existing recruitment candidates by:
 * - display_name (ilike)
 * - platform_username (ilike)
 * - bio (ilike)
 * - tags (array contains)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  // Search by name, username, bio using OR
  const { data: byText } = await supabase
    .from('recruitment_candidates')
    .select('id, display_name, platform_username, bio, followers_count, status, avatar_url, tags')
    .or(`display_name.ilike.%${q}%,platform_username.ilike.%${q}%,bio.ilike.%${q}%`)
    .order('followers_count', { ascending: false, nullsFirst: false })
    .limit(30);

  // Also search by tags (array contains)
  const { data: byTags } = await supabase
    .from('recruitment_candidates')
    .select('id, display_name, platform_username, bio, followers_count, status, avatar_url, tags')
    .contains('tags', [q])
    .order('followers_count', { ascending: false, nullsFirst: false })
    .limit(30);

  // Merge and deduplicate
  const seen = new Set<string>();
  const results: typeof byText = [];
  for (const row of [...(byText || []), ...(byTags || [])]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      results.push(row);
    }
  }

  return NextResponse.json({ results });
}
