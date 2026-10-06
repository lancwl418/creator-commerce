import { createClient } from '@/lib/supabase/client';

export async function disconnectStore(connectionId: string): Promise<void> {
  const { error } = await createClient().from('creator_store_connections')
    .update({ status: 'disconnected', access_token: null, refresh_token: null }).eq('id', connectionId);
  if (error) throw new Error(error.message);
}
