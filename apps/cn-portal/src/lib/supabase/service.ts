import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * 服务端密钥的 Supabase client，绕过 RLS。只用于用户会话之外的写入
 * （如回写 ERP 客户 id），不要在带用户身份的读取里使用。
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
