/** creator_store_connections 的一行（卖家视角） */
export interface StoreConnection {
  id: string;
  platform: string;
  store_name: string | null;
  store_url: string | null;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  last_sync_at: string | null;
  connected_at: string | null;
}

export interface StoresPageProps {
  searchParams: Promise<{ connected?: string | string[]; error?: string | string[] }>;
}
