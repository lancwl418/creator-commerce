import { headers } from 'next/headers';

/**
 * 本站对外的地址，用来拼邮件里的回跳链接。
 * 优先用 CN_PORTAL_PUBLIC_URL（Render 的环境组被几个 app 共用，APP_URL 指向的是 Creator Portal，
 * 不能拿来用）；没有配置时取当前请求的来源。Supabase 只会跳转到后台白名单里的地址。
 */
export async function getRequestOrigin(): Promise<string> {
  const configured = process.env.CN_PORTAL_PUBLIC_URL?.trim();
  if (configured) return new URL(configured).origin;

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');
  if (origin) return origin;
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) throw new Error('Cannot determine the request origin');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
