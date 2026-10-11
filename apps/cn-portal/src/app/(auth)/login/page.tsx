import { safeReturnPath } from '@/lib/sellers/registration';
import type { AuthPageProps } from '@/lib/types/seller';
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  return <LoginForm next={safeReturnPath(next)} />;
}
