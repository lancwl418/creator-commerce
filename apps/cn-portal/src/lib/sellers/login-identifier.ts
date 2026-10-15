/**
 * 平台内部账号（如管理员 admin）没有真实邮箱，Supabase Auth 又只认邮箱登录，
 * 所以给这类账号固定一个本地域名：用户名 admin ↔ 邮箱 admin@cn-portal.local。
 * 与 migration 032 建管理员账号时用的邮箱保持一致。
 */
export const LOCAL_ACCOUNT_EMAIL_DOMAIN = 'cn-portal.local';

/** 登录框里输入的账号（邮箱或用户名）→ Supabase 登录用的邮箱。 */
export function resolveLoginEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  if (!value) return '';
  return value.includes('@') ? value : `${value}@${LOCAL_ACCOUNT_EMAIL_DOMAIN}`;
}
