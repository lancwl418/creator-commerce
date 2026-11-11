'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isLocale, LOCALE_COOKIE, type Locale } from './messages';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** 切换界面语言：记到 cookie（登录页也能用），已登录时同时写回 admin_users.locale。 */
export async function setLocaleAction(locale: Locale): Promise<{ error?: string }> {
  if (!isLocale(locale)) return { error: 'Unsupported locale' };
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR_SECONDS, sameSite: 'lax' });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { error } = await supabase.rpc('set_my_admin_locale', { p_locale: locale });
  return error ? { error: error.message } : {};
}
