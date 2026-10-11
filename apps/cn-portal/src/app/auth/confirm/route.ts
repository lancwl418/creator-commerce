import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeReturnPath } from '@/lib/sellers/registration';
import { createClient } from '@/lib/supabase/server';

const EMAIL_OTP_TYPES: EmailOtpType[] = ['signup', 'recovery', 'email_change', 'email', 'invite', 'magiclink'];

/**
 * 邮件链接的落地路由：把链接里的凭证换成会话，再跳到站内目标页。
 * 兼容两种链接：PKCE 的 ?code=…，以及自定义邮件模板里的 ?token_hash=…&type=…。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeReturnPath(searchParams.get('next'));
  const supabase = await createClient();

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type && EMAIL_OTP_TYPES.includes(type)
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error('Missing confirmation token') };

  if (error) {
    console.error('Email confirmation failed', error);
    return NextResponse.redirect(new URL('/login?error=link', request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
