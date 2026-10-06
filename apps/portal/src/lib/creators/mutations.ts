import { createClient } from '@/lib/supabase/client';
import type { CreatorProfile } from '@/lib/types/creator';

export async function saveCreatorProfile(creatorId: string, profile: CreatorProfile): Promise<void> {
  const db = createClient();
  const update = {
    display_name: profile.display_name.trim(), bio: profile.bio.trim(),
    country: profile.country?.trim() || null, timezone: profile.timezone?.trim() || null
  };
  const { data, error } = await db.from('creator_profiles').update(update).eq('creator_id', creatorId).select('creator_id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    const { error: insertError } = await db.from('creator_profiles').insert({ creator_id: creatorId, ...update });
    if (insertError) throw new Error(insertError.message);
  }
}

export async function setCreatorStatus(creatorId: string, status: 'suspended' | 'banned'): Promise<void> {
  const { error } = await createClient().from('creators').update({ status }).eq('id', creatorId);
  if (error) throw new Error(error.message);
}
