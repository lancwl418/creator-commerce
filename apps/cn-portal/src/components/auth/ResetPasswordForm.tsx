'use client';

import { useActionState } from 'react';
import { updatePassword } from '@/lib/sellers/actions';
import { MIN_PASSWORD_LENGTH } from '@/lib/sellers/registration';
import type { AuthFormState } from '@/lib/types/seller';
import { t } from '@/lib/i18n';
import AuthCard from './AuthCard';
import AuthField from './AuthField';
import AuthFormStatus from './AuthFormStatus';
import AuthSubmitButton from './AuthSubmitButton';

const INITIAL_STATE: AuthFormState = {};

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, INITIAL_STATE);
  return (
    <AuthCard
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      switchText={t('auth.forgot.remembered')}
      switchLabel={t('auth.login.submit')}
      switchHref="/login"
    >
      <form action={action} className="space-y-4">
        <AuthField
          name="password"
          type="password"
          label={t('auth.field.newPassword')}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          placeholder={t('auth.field.passwordHint', 'zh', { n: MIN_PASSWORD_LENGTH })}
        />
        <AuthField name="passwordConfirm" type="password" label={t('auth.field.passwordConfirm')} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
        <AuthFormStatus state={state} />
        <AuthSubmitButton pending={pending} label={t('auth.reset.submit')} pendingLabel={t('auth.reset.pending')} />
      </form>
    </AuthCard>
  );
}
