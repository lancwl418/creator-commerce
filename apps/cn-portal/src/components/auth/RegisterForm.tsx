'use client';

import { useActionState } from 'react';
import { signUpSeller } from '@/lib/sellers/actions';
import { MIN_PASSWORD_LENGTH } from '@/lib/sellers/registration';
import type { AuthFormState } from '@/lib/types/seller';
import { t } from '@/lib/i18n';
import AuthCard from './AuthCard';
import AuthField from './AuthField';
import AuthFormStatus from './AuthFormStatus';
import AuthSubmitButton from './AuthSubmitButton';

const INITIAL_STATE: AuthFormState = {};

export default function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpSeller, INITIAL_STATE);
  return (
    <AuthCard
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      switchText={t('auth.register.hasAccount')}
      switchLabel={t('auth.login.submit')}
      switchHref={`/login?next=${encodeURIComponent(next)}`}
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <AuthField name="companyName" defaultValue={state.values?.companyName} label={t('auth.field.companyName')} autoComplete="organization" maxLength={255} />
        <AuthField name="contactName" defaultValue={state.values?.contactName} label={t('auth.field.contactName')} autoComplete="name" maxLength={100} />
        <AuthField name="phone" defaultValue={state.values?.phone} type="tel" label={t('auth.field.phone')} autoComplete="tel" maxLength={20} />
        <AuthField name="email" defaultValue={state.values?.email} type="email" label={t('auth.field.email')} autoComplete="email" />
        <AuthField
          name="password"
          type="password"
          label={t('auth.field.password')}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          placeholder={t('auth.field.passwordHint', 'zh', { n: MIN_PASSWORD_LENGTH })}
        />
        <AuthFormStatus state={state} />
        <AuthSubmitButton pending={pending} label={t('auth.register.submit')} pendingLabel={t('auth.register.pending')} />
      </form>
    </AuthCard>
  );
}
