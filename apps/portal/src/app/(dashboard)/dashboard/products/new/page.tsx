import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getDesigns } from '@/lib/queries/designs';
import NewProductFlow from './NewProductFlow';

export default async function NewProductPage() {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const designs = await getDesigns(creator.id, ['draft', 'approved', 'published']);

  return <NewProductFlow creatorId={creator.id} designs={designs} />;
}
