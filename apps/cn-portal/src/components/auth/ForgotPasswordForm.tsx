'use client';

import { useActionState } from 'react';
import { requestPasswordReset } from '@/lib/sellers/actions';
import type { AuthFormState } from '@/lib/types/seller';
import { t } from '@/lib/i18n';
import AuthCard from './AuthCard';
import AuthField from './AuthField';
import AuthFormStatus from './AuthFormStatus';
import AuthSubmitButton from './AuthSubmitButton';

const INITIAL_STATE: AuthFormState = {};

export default function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL_STATE);
  return (
    <AuthCard
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      switchText={t('auth.forgot.remembered')}
      switchLabel={t('auth.login.submit')}
      switchHref="/login"
    >
      <form action={action} className="space-y-4">
        <AuthField name="email" defaultValue={state.values?.email} type="email" label={t('auth.field.email')} autoComplete="email" />
        <AuthFormStatus state={expired && !state.error && !state.notice ? { error: t('auth.error.linkExpired') } : state} />
        <AuthSubmitButton pending={pending} label={t('auth.forgot.submit')} pendingLabel={t('auth.forgot.pending')} />
      </form>
    </AuthCard>
  );
}
