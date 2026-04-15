import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('user_type')
    .eq('auth_user_id', user.id)
    .single();

  const userType = (creator?.user_type as 'designer' | 'distributor') ?? 'designer';

  return (
    <div className="min-h-screen bg-surface-secondary flex">
      <Sidebar userType={userType} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-border-light h-16 flex items-center justify-between px-6 pl-16 md:pl-6 shrink-0 sticky top-0 z-30">
          <div />
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
