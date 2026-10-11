import { requireSeller } from '@/lib/sellers/session';
import { getStoreConnections } from '@/lib/queries/stores';
import { oauthResultMessage } from '@/lib/stores/oauth-result';
import type { StoresPageProps } from '@/lib/types/store';
import StoresPage from '@/components/stores/StoresPage';

export const dynamic = 'force-dynamic';

export default async function SellerStoresPage({ searchParams }: StoresPageProps) {
  const seller = await requireSeller();
  const [stores, params] = await Promise.all([getStoreConnections(seller.id), searchParams]);
  const { notice, error } = oauthResultMessage(params);
  return <StoresPage stores={stores} notice={notice} error={error} />;
}
