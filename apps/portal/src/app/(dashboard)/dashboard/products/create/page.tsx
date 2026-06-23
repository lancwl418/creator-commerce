import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import CreateWizard from './CreateWizard';

export default async function CreateProductPage({
  searchParams,
}: {
  searchParams: Promise<{ templates?: string; cache_key?: string }>;
}) {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const { templates, cache_key } = await searchParams;
  if (!templates || !cache_key) redirect('/dashboard/catalog');

  return <CreateWizard creatorId={creator.id} templates={templates} cacheKey={cache_key} />;
}
