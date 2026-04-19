export interface StoreConnection {
  id: string;
  platform: string;
  store_name: string | null;
  store_url: string | null;
  status: string;
  last_sync_at?: string | null;
  connected_at?: string | null;
}
