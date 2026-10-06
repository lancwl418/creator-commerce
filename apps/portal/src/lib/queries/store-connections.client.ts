import { createClient } from '@/lib/supabase/client';
import type { StoreConnection } from '@/lib/types/store';

export async function getConnectedStores(): Promise<StoreConnection[]> {
  const db = createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) throw new Error('Please sign in to load stores');
  const { data: creator, error: creatorError } = await db.from('creators').select('id').eq('auth_user_id', user.id).single();
  if (creatorError || !creator) throw new Error(creatorError?.message || 'Creator profile not found');
  const { data, error } = await db.from('creator_store_connections')
    .select('id, platform, store_name, store_url, status').eq('creator_id', creator.id).eq('status', 'connected')
    .returns<StoreConnection[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
