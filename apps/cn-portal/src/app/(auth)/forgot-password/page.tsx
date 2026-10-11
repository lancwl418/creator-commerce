import type { AuthPageProps } from '@/lib/types/seller';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default async function ForgotPasswordPage({ searchParams }: AuthPageProps) {
  const { error } = await searchParams;
  return <ForgotPasswordForm expired={error === 'expired'} />;
}
