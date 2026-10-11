'use client';

import { useActionState } from 'react';
import { signInSeller } from '@/lib/sellers/actions';
import type { AuthFormState } from '@/lib/types/seller';
import { t } from '@/lib/i18n';
import AuthCard from './AuthCard';
import AuthField from './AuthField';
import AuthFormStatus from './AuthFormStatus';
import AuthSubmitButton from './AuthSubmitButton';

const INITIAL_STATE: AuthFormState = {};

export default function LoginForm({ next }: { next: string }) {
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
        <AuthField name="email" defaultValue={state.values?.email} type="email" label={t('auth.field.email')} autoComplete="email" />
        <AuthField name="password" type="password" label={t('auth.field.password')} autoComplete="current-password" />
        <AuthFormStatus state={state} />
        <AuthSubmitButton pending={pending} label={t('auth.login.submit')} pendingLabel={t('auth.login.pending')} />
      </form>
    </AuthCard>
  );
}
