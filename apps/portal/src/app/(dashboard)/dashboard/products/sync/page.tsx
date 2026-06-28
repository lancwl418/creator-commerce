import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import SyncFromDesign from './SyncFromDesign';

export default async function SyncFromDesignPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    // Not logged in: bounce to login with a return path. The design payload is
    // already stashed in sessionStorage and survives the login/register hop, so
    // we land back here and create the product once authenticated. (Middleware
    // normally adds the same ?next before this renders — this is a fallback.)
    redirect('/login?next=/dashboard/products/sync');
  }

  return <SyncFromDesign creatorId={creator.id} />;
}
