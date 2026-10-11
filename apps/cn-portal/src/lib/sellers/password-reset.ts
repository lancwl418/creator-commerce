import type { MessageKey } from '../i18n';
import { MIN_PASSWORD_LENGTH } from './registration';

/** 邮件里的链接回到本站的确认路由，由它换取会话后再跳到目标页。 */
export const AUTH_CONFIRM_PATH = '/auth/confirm';
export const RESET_PASSWORD_PATH = '/reset-password';

/** 邮件链接的回跳地址：确认路由 + 站内目标页。 */
export function emailRedirectUrl(origin: string, next: string): string {
  const url = new URL(AUTH_CONFIRM_PATH, origin);
  url.searchParams.set('next', next);
  return url.toString();
}

export type ParsedNewPassword =
  | { ok: true; password: string }
  | { ok: false; error: MessageKey };

/** 重设密码表单：两次输入一致且满足最小长度；密码不去首尾空格。 */
export function parseNewPassword(form: FormData): ParsedNewPassword {
  const password = form.get('password');
  const confirm = form.get('passwordConfirm');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'auth.error.passwordLength' };
  }
  if (password !== confirm) return { ok: false, error: 'auth.error.passwordMismatch' };
  return { ok: true, password };
}
