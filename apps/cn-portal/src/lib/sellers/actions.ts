'use server';

import { redirect } from 'next/navigation';
import { t } from '../i18n';
import { getRequestOrigin } from '../request-origin';
import { createClient } from '../supabase/server';
import type { AuthFormState } from '../types/seller';
import { syncSellerToErp } from './erp-sync';
import { RESET_PASSWORD_PATH, emailRedirectUrl, parseNewPassword } from './password-reset';
import { authErrorMessage, parseRegistration, refillValues, safeReturnPath, signupMetadata } from './registration';

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function hasSellerAccount(supabase: Supabase, authUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cn_sellers')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load seller account: ${error.message}`);
  return data != null;
}

export async function signUpSeller(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = refillValues(form);
  const parsed = parseRegistration(form);
  if (!parsed.ok) return { error: t(parsed.error), values };
  const { registration } = parsed;
  const supabase = await createClient();

  // 卖家账户表还没建好（migration 026 未执行）时不能注册：否则数据库的注册触发器
  // 会把这个用户建成 Creator，而不是卖家。
  const { error: tableError } = await supabase.from('cn_sellers').select('id').limit(1);
  if (tableError) {
    console.error('Seller accounts are unavailable', tableError);
    return { error: t('auth.error.unavailable'), values };
  }

  const next = safeReturnPath(form.get('next') as string | null);
  const { data, error } = await supabase.auth.signUp({
    email: registration.email,
    password: registration.password,
    options: {
      data: signupMetadata(registration),
      // 开启邮箱验证时，验证链接回到本站而不是 Supabase 项目的默认站点
      emailRedirectTo: emailRedirectUrl(await getRequestOrigin(), next),
    },
  });
  if (error) {
    console.error('Seller sign-up failed', error);
    return { error: t(authErrorMessage(error.code, 'auth.error.registerFailed')), values };
  }
  // 开启邮箱验证时，已注册的邮箱不会报错，而是返回一个没有 identity 的用户。
  if (!data.user || data.user.identities?.length === 0) return { error: t('auth.error.emailTaken'), values };

  try {
    await syncSellerToErp({
      authUserId: data.user.id,
      email: registration.email,
      companyName: registration.companyName,
      contactName: registration.contactName,
      phone: registration.phone,
      tier: 'CN_MERCHANT',
    });
  } catch (syncError) {
    // ERP 同步失败不影响注册，账户已经建好，可以事后补同步。
    console.error('Failed to sync seller to ERP', syncError);
  }

  // 项目开启了邮箱验证时注册后没有会话，需要先验证邮箱再登录。
  if (!data.session) return { notice: t('auth.notice.confirmEmail') };
  redirect(next);
}

export async function signInSeller(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const values = { email };
  if (!email || !password) return { error: t('auth.error.required'), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: t(authErrorMessage(error.code, 'auth.error.loginFailed')), values };
  }

  // 与 Creator Portal 共用登录体系：只有建了卖家账户的用户才能进卖家平台。
  if (!(await hasSellerAccount(supabase, data.user.id))) {
    await supabase.auth.signOut();
    return { error: t('auth.error.notSeller'), values };
  }
  redirect(safeReturnPath(form.get('next') as string | null));
}

export async function requestPasswordReset(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const values = { email };
  if (!email) return { error: t('auth.error.required'), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: emailRedirectUrl(await getRequestOrigin(), RESET_PASSWORD_PATH),
  });
  // 邮箱不存在时 Supabase 同样返回成功；只有发信频率等真实错误才提示，避免暴露邮箱是否已注册。
  if (error) {
    console.error('Password reset request failed', error);
    return { error: t(authErrorMessage(error.code, 'auth.error.resetFailed')), values };
  }
  return { notice: t('auth.notice.resetEmailSent') };
}

export async function updatePassword(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = parseNewPassword(form);
  if (!parsed.ok) return { error: t(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    console.error('Password update failed', error);
    return { error: t(authErrorMessage(error.code, 'auth.error.resetFailed')) };
  }
  redirect('/products');
}

export async function signOutSeller(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
