import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getStoreConnections } from '@/lib/queries/stores';
import StoresClient from './StoresClient';

export default async function StoresPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const stores = await getStoreConnections(creator.id);

  return <StoresClient creatorId={creator.id} initialStores={stores} />;
}
