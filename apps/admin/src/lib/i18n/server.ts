import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createTranslator, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale, type Translate } from './messages';

/**
 * 当前请求的界面语言：已登录的后台账号以 admin_users.locale 为准；
 * 未登录（登录页）或查不到时用 cookie（上次切换的选择），再退回英文。同一次请求只查一次。
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('admin_users')
      .select('locale')
      .eq('auth_user_id', user.id)
      .maybeSingle<{ locale: string | null }>();
    if (isLocale(data?.locale)) return data.locale;
  }
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
});

export async function getTranslator(): Promise<{ locale: Locale; t: Translate }> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
