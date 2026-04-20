import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let creator;
  try {
    ({ creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const userType = (creator.user_type as 'designer' | 'distributor') ?? 'designer';

  return (
    <div className="min-h-screen bg-surface-secondary flex">
      <Sidebar userType={userType} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-border-light h-16 flex items-center justify-end px-6 pl-16 md:pl-6 shrink-0 sticky top-0 z-30">
          <a
            href="/dashboard/settings"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Settings
          </a>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
