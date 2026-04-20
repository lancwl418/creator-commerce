import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import ImportFlow from './ImportFlow';

export default async function ImportFromEditorPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  return <ImportFlow creatorId={creator.id} />;
}
