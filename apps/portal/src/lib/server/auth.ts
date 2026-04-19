import { createClient } from '@/lib/supabase/server';

export interface AuthContext {
  user: { id: string; email?: string };
  creator: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Get authenticated user and their creator record.
 * Throws if not authenticated or creator not found.
 * Use in server components and API routes.
 */
export async function requireCreator(): Promise<AuthContext> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!creator) throw new Error('Creator not found');

  return { user, creator, supabase };
}
