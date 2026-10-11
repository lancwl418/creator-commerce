import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

// 只有通过邮件链接拿到会话的用户才能重设密码；直接打开则回到忘记密码页重新申请。
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/forgot-password?error=expired');
  return <ResetPasswordForm />;
}
