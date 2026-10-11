import { createClient } from '../supabase/client';

/** 断开店铺：保留记录、清掉 token。写入权限由 RLS 的 store_conn_update_own 控制。 */
export async function disconnectStore(connectionId: string): Promise<void> {
  const { error } = await createClient()
    .from('creator_store_connections')
    .update({ status: 'disconnected', access_token: null, refresh_token: null })
    .eq('id', connectionId);
  if (error) throw new Error(error.message);
}
