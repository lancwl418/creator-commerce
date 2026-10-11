import { createClient } from '../supabase/server';
import type { StoreConnection } from '../types/store';

export const STORE_CONNECTION_COLUMNS = 'id, platform, store_name, store_url, status, last_sync_at, connected_at';

/** 卖家连接的店铺；与 Creator Portal 共用 creator_store_connections 表。 */
export async function getStoreConnections(creatorId: string): Promise<StoreConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('creator_store_connections')
    .select(STORE_CONNECTION_COLUMNS)
    .eq('creator_id', creatorId)
    .order('connected_at', { ascending: false })
    .returns<StoreConnection[]>();
  if (error) throw new Error(`Failed to load store connections: ${error.message}`);
  return data ?? [];
}
