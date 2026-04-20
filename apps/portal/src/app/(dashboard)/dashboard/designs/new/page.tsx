import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import DesignUploadFlow from './DesignUploadFlow';

export default async function NewDesignPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  return <DesignUploadFlow creatorId={creator.id} />;
}
