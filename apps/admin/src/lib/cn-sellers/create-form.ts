import { isSellerTier, type SellerTier } from '@creator-commerce/shared/erp/pricing';
import type { MessageKey } from '@/lib/i18n/messages';

/**
 * 平台建的内部账号没有真实邮箱时用的本地域名：用户名 xxx ↔ 邮箱 xxx@cn-portal.local。
 * 与 cn-portal 登录页（lib/sellers/login-identifier.ts）保持一致，卖家在 cn-portal 可直接输入用户名登录。
 */
export const LOCAL_ACCOUNT_EMAIL_DOMAIN = 'cn-portal.local';
export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,39}$/;
const PHONE_PATTERN = /^\+?[\d\s-]{6,20}$/;

export interface CnSellerCreateInput {
  /** Supabase 登录邮箱（用户名已补成 @cn-portal.local） */
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone: string;
  tier: SellerTier;
  supplierIds: string[];
}

/** 提交失败时回填的字段（不含密码） */
export const REFILL_FIELDS = ['account', 'companyName', 'contactName', 'phone', 'tier'] as const;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** 账号输入 → 登录邮箱：带 @ 的按邮箱校验，否则按用户名补本地域名。无效返回 null。 */
export function resolveAccountEmail(account: string): string | null {
  const value = account.trim().toLowerCase();
  if (value.includes('@')) return EMAIL_PATTERN.test(value) ? value : null;
  return USERNAME_PATTERN.test(value) ? `${value}@${LOCAL_ACCOUNT_EMAIL_DOMAIN}` : null;
}

/** 解析「新建中国卖家」表单。供应商字段名为 supplier（可多选）。 */
export function parseCnSellerForm(
  form: FormData
): { ok: true; input: CnSellerCreateInput } | { ok: false; error: MessageKey } {
  const password = typeof form.get('password') === 'string' ? String(form.get('password')) : '';
  const companyName = text(form, 'companyName');
  const contactName = text(form, 'contactName');
  const phone = text(form, 'phone');
  const tier = text(form, 'tier') || 'CN_MERCHANT';

  if (!companyName || !contactName) return { ok: false, error: 'cnSellers.create.error.required' };
  const email = resolveAccountEmail(text(form, 'account'));
  if (!email) return { ok: false, error: 'cnSellers.create.error.account' };
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'cnSellers.create.error.password' };
  if (!PHONE_PATTERN.test(phone)) return { ok: false, error: 'cnSellers.create.error.phone' };
  if (!isSellerTier(tier)) return { ok: false, error: 'cnSellers.create.error.tier' };

  const supplierIds = [...new Set(form.getAll('supplier').filter((v): v is string => typeof v === 'string' && v.trim() !== ''))];
  return { ok: true, input: { email, password, companyName, contactName, phone, tier, supplierIds } };
}
