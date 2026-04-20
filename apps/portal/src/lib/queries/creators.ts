import { createClient } from '@/lib/supabase/server';

export async function getCreatorProfile(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('creator_profiles')
    .select('display_name, bio, avatar_url, country, timezone')
    .eq('creator_id', creatorId)
    .single();

  return data;
}
