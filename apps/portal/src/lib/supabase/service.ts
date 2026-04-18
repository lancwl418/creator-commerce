import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client using the service role key — bypasses RLS.
 * Only use in server-side contexts without user auth (e.g., webhook handlers).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
