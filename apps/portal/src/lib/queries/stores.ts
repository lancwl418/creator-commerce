import { createClient } from '@/lib/supabase/server';

export async function getStoreConnections(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('creator_id', creatorId)
    .order('connected_at', { ascending: false });

  return data || [];
}
