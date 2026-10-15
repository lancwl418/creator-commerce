'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInSeller } from '@/lib/sellers/actions';
import type { AuthFormState } from '@/lib/types/seller';
import { t } from '@/lib/i18n';
import AuthCard from './AuthCard';
import AuthField from './AuthField';
import AuthFormStatus from './AuthFormStatus';
import AuthSubmitButton from './AuthSubmitButton';

const INITIAL_STATE: AuthFormState = {};

export default function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState(signInSeller, INITIAL_STATE);
  return (
    <AuthCard
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      switchText={t('auth.login.noAccount')}
      switchLabel={t('auth.register.submit')}
      switchHref={`/register?next=${encodeURIComponent(next)}`}
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {/* 账号可以是邮箱或平台内部用户名，所以不用 type=email */}
        <AuthField name="email" defaultValue={state.values?.email} type="text" label={t('auth.field.account')} autoComplete="username" />
        <AuthField name="password" type="password" label={t('auth.field.password')} autoComplete="current-password" />
        <div className="text-right -mt-2">
          <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <AuthFormStatus state={linkError && !state.error && !state.notice ? { error: t('auth.error.linkExpired') } : state} />
        <AuthSubmitButton pending={pending} label={t('auth.login.submit')} pendingLabel={t('auth.login.pending')} />
      </form>
    </AuthCard>
  );
}
