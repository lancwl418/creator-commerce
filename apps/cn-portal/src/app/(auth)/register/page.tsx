import { safeReturnPath } from '@/lib/sellers/registration';
import type { AuthPageProps } from '@/lib/types/seller';
import RegisterForm from '@/components/auth/RegisterForm';

export default async function RegisterPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  return <RegisterForm next={safeReturnPath(next)} />;
}
