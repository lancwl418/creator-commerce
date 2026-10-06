import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getDashboardData } from '@/lib/queries/dashboard';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export default async function DashboardPage() {
  let creator, user;
  try { ({ creator, user } = await requireCreator()); }
  catch { redirect('/login'); }
  const data = await getDashboardData(creator.id, user.email || 'Creator');
  return <DashboardOverview data={data} />;
}
