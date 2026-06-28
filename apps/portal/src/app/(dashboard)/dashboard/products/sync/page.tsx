import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import SyncFromDesign from './SyncFromDesign';

export default async function SyncFromDesignPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    // Not logged in: the design payload is already stashed in sessionStorage.
    // Step 1 just bounces to login; the resume-after-login flow is Step 2.
    redirect('/login');
  }

  return <SyncFromDesign creatorId={creator.id} />;
}
