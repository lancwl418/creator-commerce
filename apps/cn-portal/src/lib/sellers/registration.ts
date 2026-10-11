import type { MessageKey } from '../i18n';
import type { SellerRegistration } from '../types/seller';

/** 写入 auth 用户 metadata 的注册来源；数据库的注册触发器据此建卖家账户而不是 Creator 记录。 */
export const CN_PORTAL_SIGNUP_APP = 'cn_portal';

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{6,20}$/;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

const REFILLABLE_FIELDS = ['companyName', 'contactName', 'phone', 'email'];

/** 提交失败后回填表单用的内容；不包含密码。 */
export function refillValues(form: FormData): Record<string, string> {
  return Object.fromEntries(REFILLABLE_FIELDS.map((name) => [name, field(form, name)]));
}

export type ParsedRegistration =
  | { ok: true; registration: SellerRegistration }
  | { ok: false; error: MessageKey };

export function parseRegistration(form: FormData): ParsedRegistration {
  const password = form.get('password');
  const registration: SellerRegistration = {
    email: field(form, 'email').toLowerCase(),
    // 密码不去首尾空格
    password: typeof password === 'string' ? password : '',
    companyName: field(form, 'companyName'),
    contactName: field(form, 'contactName'),
    phone: field(form, 'phone'),
  };

  if (!registration.companyName || !registration.contactName) return { ok: false, error: 'auth.error.required' };
  if (!PHONE_PATTERN.test(registration.phone)) return { ok: false, error: 'auth.error.phone' };
  if (!EMAIL_PATTERN.test(registration.email)) return { ok: false, error: 'auth.error.email' };
  if (registration.password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'auth.error.passwordLength' };
  return { ok: true, registration };
}

/** 注册时随 auth 用户保存的资料；字段名与 migration 026 的注册触发器一致。 */
export function signupMetadata(registration: SellerRegistration): Record<string, string> {
  return {
    signup_app: CN_PORTAL_SIGNUP_APP,
    company_name: registration.companyName,
    contact_name: registration.contactName,
    phone: registration.phone,
  };
}

/** 登录后回跳的站内路径；只接受本站相对路径。 */
export function safeReturnPath(next: string | string[] | null | undefined, fallback = '/products'): string {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
}

const AUTH_ERROR_MESSAGES: Record<string, MessageKey> = {
  invalid_credentials: 'auth.error.invalidCredentials',
  user_already_exists: 'auth.error.emailTaken',
  email_exists: 'auth.error.emailTaken',
  email_not_confirmed: 'auth.error.emailNotConfirmed',
  weak_password: 'auth.error.passwordLength',
  email_address_invalid: 'auth.error.email',
  over_email_send_rate_limit: 'auth.error.rateLimited',
  over_request_rate_limit: 'auth.error.rateLimited',
};

/** Supabase Auth 错误码 → 界面文案；不认识的错误码用兜底文案。 */
export function authErrorMessage(code: string | undefined, fallback: MessageKey): MessageKey {
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
}
