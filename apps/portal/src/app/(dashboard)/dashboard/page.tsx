import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from('creators')
    .select('*, creator_profiles(*)')
    .eq('auth_user_id', user!.id)
    .single();

  const displayName = creator?.creator_profiles?.display_name || creator?.email;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Welcome, {displayName}</h2>
      <p className="text-gray-500 mb-8">Here&apos;s your creator dashboard</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Designs</p>
          <p className="text-3xl font-bold mt-1">0</p>
        </div>
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Published Products</p>
          <p className="text-3xl font-bold mt-1">0</p>
        </div>
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Earnings</p>
          <p className="text-3xl font-bold mt-1">$0.00</p>
        </div>
      </div>
    </div>
  );
}
